import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

// These tests intentionally use real sockets. Restricted sandboxes may fail at listen with EPERM.
test('editor authenticates routes, saves validated compositions, streams ranges and SSE', async () => {
  const home = await mkdtemp(path.join(os.tmpdir(),'showreel-editor-'));
  const previousHome = process.env.SHOWREEL_HOME; process.env.SHOWREEL_HOME = home;
  let server;
  try {
    const { startEditorServer } = await import('../scripts/lib/editor/server.mjs');
    const { resolveComposition } = await import('../scripts/lib/compose/composition.mjs');
    const dir = path.join(home,'projects','test'), runDir = path.join(dir,'runs','run1'); await mkdir(runDir,{recursive:true});
    const composition = resolveComposition({run:{id:'run1'},cards:{title:{enabled:false}}});
    for (const [file,data] of Object.entries({ 'brief.json':{}, 'storyboard.json':{steps:[]}, 'composition.json':composition,
      'runs/run1/events.json':{viewport:{width:100,height:100},cursor:[],clicks:[],steps:[],targets:[],keys:[]},
      'runs/run1/record.json':{runId:'run1',durationSec:5,scale:{used:1}} })) await writeFile(path.join(dir,file),JSON.stringify(data));
    await writeFile(path.join(runDir,'raw.mp4'),'0123456789'); await writeFile(path.join(dir,'image.png'),'image');
    server = await startEditorServer({name:'test',runId:'run1'});
    const base = `http://127.0.0.1:${server.port}`;
    const bearer = {Authorization:`Bearer ${server.token}`};
    const request = async (route,options={}) => fetch(base+route,{...options,headers:{...bearer,...options.headers},redirect:'manual'});
    assert.equal((await fetch(base+'/api/project')).status,401);
    const first = await fetch(server.url,{redirect:'manual'});
    assert.equal(first.status,303); assert.equal(first.headers.get('location'),'/');
    const cookie = first.headers.get('set-cookie'); assert.match(cookie,/HttpOnly/); assert.match(cookie,/SameSite=Strict/);
    assert.equal((await fetch(base+'/',{headers:{Cookie:cookie.split(';')[0]}})).status,200);
    assert.match(await (await request('/')).text(),/Showreel editor|editor bundle is not built/);
    const project = await (await request('/api/project')).json();
    assert.equal(project.runId,'run1'); assert.deepEqual(project.runs,['run1']); assert.ok(project.settings.length);
    const wrongOrigin = await request('/api/export/cancel',{method:'POST',headers:{Origin:'https://example.com'}}); assert.equal(wrongOrigin.status,403);
    assert.equal(wrongOrigin.headers.get('access-control-allow-origin'),null);
    const badHost = await new Promise((resolve,reject) => {
      const req = http.get(base+'/api/project',{headers:{...bearer,Host:`example.com:${server.port}`}},res => {res.resume();resolve(res.statusCode);}); req.on('error',reject);
    }); assert.equal(badHost,403);
    const range = await request('/media/raw.mp4',{headers:{Range:'bytes=2-5'}});
    assert.equal(range.status,206); assert.equal(range.headers.get('content-range'),'bytes 2-5/10'); assert.equal(await range.text(),'2345');
    assert.equal((await request('/media/raw.mp4',{headers:{Range:'bytes=20-'}})).status,416);
    assert.equal(await (await request('/media/asset/image.png')).text(),'image');
    for (const route of ['/media/asset/%2e%2e%2fbrief.json','/fonts/%2e%2e%2fpackage.json','/media/asset/brief.json']) assert.ok((await request(route)).status >= 400,route);
    let response = await request('/api/composition',{method:'PUT',body:JSON.stringify({...composition,output:{...composition.output,fps:12}})});
    assert.equal(response.status,400); assert.ok((await response.json()).errors.length);
    response = await request('/api/composition',{method:'PUT',body:JSON.stringify({...composition,captions:{...composition.captions,cues:[{id:'c',text:'Outside',start:4,end:6}]}})}); assert.equal(response.status,400);
    response = await request('/api/composition',{method:'PUT',body:'{'}); assert.equal(response.status,400);
    response = await request('/api/composition',{method:'PUT',body:' '.repeat(1024*1024+1)}); assert.equal(response.status,413);
    composition.captions.cues = [{id:'c',text:'Edited',start:1,end:3}];
    assert.equal((await request('/api/composition',{method:'PUT',body:JSON.stringify(composition)})).status,200);
    assert.deepEqual(JSON.parse(await readFile(path.join(dir,'composition.json'),'utf8')),composition);
    const controller = new AbortController();
    const events = await request('/api/export/events',{signal:controller.signal});
    assert.match(events.headers.get('content-type'),/text\/event-stream/);
    const reader = events.body.getReader(); const chunk = await reader.read(); assert.match(new TextDecoder().decode(chunk.value),/event: idle/);
    await reader.cancel(); controller.abort();
    assert.equal((await request('/api/export/cancel',{method:'POST'})).status,200);
  } finally {
    await server?.close();
    if (previousHome === undefined) delete process.env.SHOWREEL_HOME; else process.env.SHOWREEL_HOME = previousHome;
    await rm(home,{recursive:true,force:true});
  }
});
