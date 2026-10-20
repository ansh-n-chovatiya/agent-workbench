import { handleBrandApi } from './brand-api.mjs'; // Task E: brand UI API hook (existing auth and assets reused).
import { readScenes, validateScenesInProject, writeScenesAtomic, validRunId } from '../scenes.mjs';
import { loadBriefBrand, resolveBrandRoute } from '../brand/storage.mjs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readFile, readdir, stat } from 'node:fs/promises';
import { loadRunComposition, renderRun, resolveImageAssets } from '../compose/render.mjs';
import { validateComposition, resolveComposition } from '../compose/composition.mjs';
import { buildTimeMap } from '../compose/timemap.mjs';
import { validateRegions } from '../compose/zoom.mjs';
import { SETTINGS, SETTINGS_VERSION } from '../compose/settings-schema.mjs';
import { authorized, validHost, validOrigin, sessionCookie, stripToken, safeRelativePath, parseRange, formatSSE } from './http.mjs';
import { safeFile, writeCompositionAtomic } from './files.mjs';
import { readBody } from './body.mjs';
import { createExportJob } from './export-job.mjs';
import { openDefault } from './opener.mjs';
import { createVoiceApi } from './voice-api.mjs';
import { handleUploadApi } from './upload-api.mjs';

const root = fileURLToPath(new URL('../../../',import.meta.url));
const types = { '.js':'text/javascript', '.css':'text/css', '.html':'text/html; charset=utf-8', '.woff2':'font/woff2', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.svg':'image/svg+xml', '.gif':'image/gif', '.webp':'image/webp' };
export async function startEditorServer({ name, runId, port = 0, host = '127.0.0.1', token = randomBytes(24).toString('hex'), onExport, uploadLimit } = {}) {
  if (!['127.0.0.1','localhost'].includes(host)) throw new Error('Editor host must be loopback');
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Invalid editor port');
  if (!/^[a-f0-9]{48}$/.test(token)) throw new Error('Editor token must be 24 bytes of hex');
  const project = await loadRunComposition({ name, runId });
  // Check realpath containment for the recording too, including symlinked run folders.
  const rawFile = await safeFile(project.dir, `runs/${encodeURIComponent(project.runId)}/raw.mp4`);
  let boundPort, lastEvent = { event:'idle', data:{} }, closing = false;
  const clients = new Set();
  let lastExport = null;
  const voiceApi = createVoiceApi({name,runId:project.runId,dir:project.dir,uploadLimit});
  const broadcast = (event,data) => {
    lastEvent = {event,data};
    if (event === 'complete') lastExport = data.audio ?? null;
    for (const response of clients) {
      if (!response.write(formatSSE(event,data))) { clients.delete(response); response.end(); }
    }
  };
  const exports = createExportJob({render:renderRun,onEvent:broadcast,onComplete:onExport});
  const server = http.createServer((request,response) => {
    const send = (status,data) => { response.writeHead(status,{'content-type':'application/json'}); response.end(JSON.stringify(data)); };
    const serve = async file => {
      response.writeHead(200,{'content-type':types[path.extname(file).toLowerCase()] ?? 'application/octet-stream'});
      response.end(await readFile(file));
    };
    const handle = async () => {
      response.setHeader('Cache-Control','no-store');
      response.setHeader('Referrer-Policy','no-referrer');
      response.setHeader('X-Content-Type-Options','nosniff');
      if (!validHost(request.headers.host,boundPort)) return send(403,{error:'Invalid Host'});
      if (!validOrigin(request.headers.origin,request.headers.host,request.method)) return send(403,{error:'Invalid Origin'});
      if (!authorized(request,token)) return send(401,{error:'Session token required'});
      response.setHeader('Set-Cookie',sessionCookie(token));
      const url = new URL(request.url,'http://localhost');
      if (url.searchParams.has('token')) {
        response.writeHead(303,{location:stripToken(request.url)}); response.end(); return;
      }
      // Inspect the raw path: URL parsing normalizes dot segments before routing.
      const route = request.url.split('?')[0];
      const method = request.method;
      if (method === 'GET' && route === '/') {
        try { return await serve(await safeFile(path.join(root,'dist/editor'),'index.html')); }
        catch (error) {
          if (error.code !== 'ENOENT') throw error;
          response.writeHead(200,{'content-type':'text/html; charset=utf-8'});
          response.end('<!doctype html><meta charset="utf-8"><title>Showreel editor</title><p>The editor bundle is not built.</p>'); return;
        }
      }
      if (method === 'GET' && (route === '/editor.js' || route === '/editor.css' || route.startsWith('/dist/editor/'))) {
        const file = route.startsWith('/dist/editor/') ? route.slice('/dist/editor/'.length) : route.slice(1);
        return serve(await safeFile(path.join(root,'dist/editor'),file));
      }
      if (method === 'GET' && route.startsWith('/fonts/')) return serve(await safeFile(path.join(root,'assets/fonts'),route.slice(7)));
      if (method === 'GET' && route.startsWith('/media/brand/')) {
        const found = await resolveBrandRoute(route.slice('/media/brand/'.length));
        if (!found) return send(404,{error:'Brand asset not found'});
        response.writeHead(200,{'content-type':found.type}); response.end(await readFile(found.file)); return;
      }
      if (method === 'GET' && route.startsWith('/media/asset/')) {
        const encoded = route.slice('/media/asset/'.length), relative = safeRelativePath(encoded);
        if (!relative) return send(400,{error:'Invalid asset path'});
        const file = await safeFile(project.dir,encoded);
        if (!['.png','.jpg','.jpeg','.svg','.gif','.webp'].includes(path.extname(file).toLowerCase())) return send(400,{error:'Unsupported image format'});
        return serve(file);
      }
      if (['GET','HEAD'].includes(method) && (route === '/media/raw.mp4' || /^\/media\/run\/[^/]+\/raw\.mp4$/.test(route))) {
        let mediaFile=rawFile;
        if (route !== '/media/raw.mp4') {
          const run=decodeURIComponent(route.split('/')[3]);
          if (!validRunId(run)) return send(400,{error:'Invalid run id'});
          mediaFile=await safeFile(project.dir,`runs/${encodeURIComponent(run)}/raw.mp4`);
        }
        const {size} = await stat(mediaFile), range = parseRange(request.headers.range,size);
        if (range === false) { response.writeHead(416,{'content-range':`bytes */${size}`}); response.end(); return; }
        const {start,end} = range ?? {start:0,end:size-1};
        response.writeHead(range ? 206 : 200,{'content-type':'video/mp4','accept-ranges':'bytes','content-length':end-start+1,
          ...(range ? {'content-range':`bytes ${start}-${end}/${size}`} : {})});
        if (method === 'HEAD' || size === 0) { response.end(); return; }
        const stream = createReadStream(mediaFile,{start,end});
        stream.on('error',error => response.destroy(error)); response.on('close',() => stream.destroy()); stream.pipe(response); return;
      }
      if (method === 'GET' && route === '/api/project') {
        const current = await loadRunComposition({name,runId:project.runId});
        const runs = (await readdir(path.join(project.dir,'runs'),{withFileTypes:true})).filter(e => e.isDirectory()).map(e => e.name).sort();
        // A damaged voice index must not stop the editor from opening; the Voice tab reports it instead.
        const {voice,clips} = await voiceApi.snapshot().catch(error => ({voice:{installed:false,error:error.message,voices:[],status:[],installCommand:'showreel voice install --yes'},clips:{version:1,clips:{},steps:{}}}));
        return send(200,{name,runId:project.runId,brief:current.brief,storyboard:current.storyboard,events:current.events,record:current.record,
          scenes:await readScenes(project.dir),composition:current.composition,brand:await loadBriefBrand(current.brief),runs,settings:SETTINGS,settingsSchemaVersion:SETTINGS_VERSION,voice,clips,lastExport});
      }
      if (method === 'PUT' && route === '/api/scenes') {
        let scenes;
        try { scenes=JSON.parse((await readBody(request)).toString('utf8')); }
        catch (error) { if (error.statusCode) throw error; return send(400,{errors:['Invalid JSON']}); }
        const validation=await validateScenesInProject(project.dir,scenes);
        if (!validation.ok) return send(400,validation);
        await writeScenesAtomic(project.dir,scenes);
        return send(200,{ok:true,warnings:validation.warnings});
      }
      if (method === 'PUT' && route === '/api/composition') {
        const body = await readBody(request);
        let composition;
        try { composition = JSON.parse(body.toString('utf8')); }
        catch { return send(400,{errors:['Invalid JSON']}); }
        const validation = validateComposition(composition,{duration:project.record.durationSec});
        if (composition?.run?.id !== project.runId) validation.errors.push('Composition belongs to another run');
        try { buildTimeMap({duration:project.record.durationSec,...composition?.edits}); }
        catch (error) { validation.errors.push(error.message); }
        validation.errors.push(...validateRegions(composition?.zoom?.regions,{duration:project.record.durationSec}).errors);
        if (validation.errors.length) return send(400,validation);
        composition = resolveComposition(composition);
        await resolveImageAssets(composition,project.dir);
        await writeCompositionAtomic(project.dir,composition);
        return send(200,{ok:true});
      }
      if (await handleBrandApi({request,route,method,send,name})) return; // Task E: brand list/apply
      if (await handleUploadApi({request,route,method,send,dir:project.dir})) return; // Panel polish: image uploads into <project>/assets/
      if (await voiceApi.handle({request,response,route,url,method,send})) return;
      if (await (await import('./export-api.mjs')).handleExportApi({request,response,route,method,send,exports,project,name,closing})) return; // Task EX: authenticated export API hook
      if (method === 'GET' && route === '/api/export/events') {
        response.writeHead(200,{'content-type':'text/event-stream','connection':'keep-alive'});
        response.write(formatSSE(lastEvent.event,lastEvent.data)); clients.add(response);
        request.on('close',() => clients.delete(response)); return;
      }
      if (method === 'POST' && route === '/api/export') {
        if (closing || !exports.start({name,runId:project.runId})) return send(409,{error:'An export is already running'});
        return send(202,{ok:true});
      }
      if (method === 'POST' && route === '/api/export/cancel') { exports.cancel(); return send(200,{ok:true}); }
      if (method === 'POST' && route === '/api/reveal') { await openDefault(path.join(project.dir,'renders')); return send(200,{ok:true}); }
      return send(404,{error:'Not found'});
    };
    handle().catch(error => {
      if (response.headersSent) { response.end(); return; }
      send(error.statusCode ?? (error.code === 'ENOENT' ? 404 : 400),{error:error.message});
    });
  });
  await new Promise((resolve,reject) => {
    server.once('error',reject); server.listen(port,host,() => { server.off('error',reject); boundPort = server.address().port; resolve(); });
  });
  return {url:`http://${host}:${boundPort}/?token=${token}`,port:boundPort,token,
    async close() {
      closing = true; exports.cancel();
      for (const response of clients) response.end(); clients.clear();
      const stopped = new Promise((resolve,reject) => server.close(error => error ? reject(error) : resolve()));
      server.closeAllConnections(); await Promise.all([stopped,exports.close(),voiceApi.close()]);
    }};
}
