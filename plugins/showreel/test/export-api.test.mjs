import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
const temp = await mkdtemp(path.join(os.tmpdir(), 'showreel-export-api-'));
process.env.SHOWREEL_HOME = path.join(temp, 'home');
const { handleExportApi, chooseFolder, chooserCommand, exportOpenerArgs } = await import('../scripts/lib/editor/export-api.mjs');
const { createExportJob } = await import('../scripts/lib/editor/export-job.mjs');
const { resolveComposition } = await import('../scripts/lib/compose/composition.mjs');
const { authorized, validHost, validOrigin } = await import('../scripts/lib/editor/http.mjs');
test.after(() => rm(temp, { recursive: true, force: true }));
test('native chooser uses fixed argv, handles cancellation, missing tools and timeout', async () => {
  assert.deepEqual(await chooserCommand('linux', async name => name === 'kdialog'), ['kdialog', ['--getexistingdirectory', os.homedir(), '--title', 'Choose where to save your videos']]);
  assert.equal(await chooserCommand('linux', async () => false), null);
  await assert.rejects(chooseFolder({platform:'linux',has:async()=>false}), error => error.statusCode === 501);
  assert.deepEqual(await chooseFolder({platform:'darwin',run:async(command,args,options)=>{
    assert.equal(command,'osascript'); assert.equal(args[0],'-e'); assert.equal(options.timeout,120000); return {stdout:'/tmp/export folder/\n'};
  }}), {dir:'/tmp/export folder/'});
  assert.deepEqual(await chooseFolder({platform:'win32',run:async(command,args)=>{assert.equal(command,'powershell.exe');assert.ok(args.includes('-STA'));return {stdout:''};}}),{cancelled:true});
  assert.deepEqual(await chooseFolder({platform:'darwin',run:async()=>{throw {stderr:'User canceled. (-128)',code:1};}}),{cancelled:true});
  assert.deepEqual(await chooseFolder({platform:'linux',has:async()=>true,run:async()=>{throw {code:1,stderr:''};}}),{cancelled:true});
  await assert.rejects(chooseFolder({platform:'linux',has:async()=>true,run:async()=>{throw {killed:true};}}),/timed out/);
  await assert.rejects(chooseFolder({platform:'darwin',run:async()=>{throw {code:'ENOENT'};}}), error=>error.statusCode === 501);
  assert.deepEqual(exportOpenerArgs('/tmp/a.mp4','reveal','darwin'),['open',['-R','/tmp/a.mp4']]);
  assert.equal(exportOpenerArgs('C:\\Videos\\a.mp4','reveal','win32')[0],'explorer.exe');
  assert.deepEqual(exportOpenerArgs('/tmp/a.mp4','reveal','linux'),['xdg-open',['/tmp']]);
});
test('authenticated loopback export API validates destinations, exports, streams ranges and confines file actions', async () => {
  const dir = path.join(process.env.SHOWREEL_HOME,'projects','test'), runDir=path.join(dir,'runs','run1');
  await mkdir(runDir,{recursive:true});
  for (const [file,data] of Object.entries({'brief.json':{},'storyboard.json':{steps:[]},'composition.json':resolveComposition({run:{id:'run1'},cards:{title:{enabled:false}}}),
    'runs/run1/events.json':{viewport:{width:100,height:100},cursor:[],clicks:[],steps:[],targets:[],keys:[]},'runs/run1/record.json':{runId:'run1',durationSec:5,scale:{used:1}}})) await writeFile(path.join(dir,file),JSON.stringify(data));
  await writeFile(path.join(runDir,'raw.mp4'),'raw');
  const renderDir=path.join(dir,'renders','test');await mkdir(renderDir,{recursive:true});await writeFile(path.join(renderDir,'poster.png'),'poster');
  const calls=[],events=[];
  const exports=createExportJob({render:async options=>{
    assert.equal(options.exportDir,path.join(temp,'exports'));
    await mkdir(options.exportDir,{recursive:true});const finalFile=path.join(options.exportDir,'test 2026-10-20 12.57.mp4');await writeFile(finalFile,'0123456789');
    return {finalFile,renderDir,sizeBytes:10,durationSec:5,width:1920,height:1080,fps:30};
  },onEvent:(event,data)=>events.push({event,data})});
  let port;const token='test-session';
  const server=http.createServer((request,response)=>{
    const send=(status,data)=>{response.writeHead(status,{'content-type':'application/json'});response.end(JSON.stringify(data));};
    if(!validHost(request.headers.host,port)||!validOrigin(request.headers.origin,request.headers.host,request.method))return send(403,{});
    if(!authorized(request,token))return send(401,{});
    handleExportApi({request,response,route:request.url.split('?')[0],method:request.method,send,exports,project:{dir,runId:'run1'},name:'test',opener:async(file,action)=>calls.push({file,action}),choose:async()=>({cancelled:true})})
      .then(handled=>{if(!handled)send(404,{});}).catch(error=>send(error.statusCode??400,{error:error.message}));
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));port=server.address().port;
  const base=`http://127.0.0.1:${port}`,request=(route,options={})=>fetch(base+route,{...options,headers:{Authorization:`Bearer ${token}`,...options.headers}});
  const post=(route,data={})=>request(route,{method:'POST',body:JSON.stringify(data)});
  try {
    for(const route of ['/api/export/settings','/api/export/poster','/api/export/download'])assert.equal((await fetch(base+route)).status,401);
    for(const route of ['/api/open','/api/reveal'])assert.equal((await post(route,{path:'/etc/passwd'})).status,404);
    assert.equal((await request('/api/export/folder',{method:'POST',headers:{Origin:'https://evil.test'},body:'{}'})).status,403);
    assert.equal(await new Promise((resolve,reject)=>{ const req=http.get(base+'/api/export/settings',{headers:{Authorization:`Bearer ${token}`,Host:`evil.test:${port}`}},response=>{response.resume();resolve(response.statusCode);});req.on('error',reject); }),403);
    assert.equal((await post('/api/export/folder',{dir:path.join(dir,'..','test','exports')})).status,400);
    assert.equal((await post('/api/export/folder',{dir:'../../tmp'})).status,400);
    assert.equal((await post('/api/export/folder',{dir:path.join(temp,'exports')})).status,200);
    assert.equal((await (await request('/api/export/settings')).json()).exportDir,path.join(temp,'exports'));
    assert.deepEqual(await (await post('/api/export/choose-folder')).json(),{cancelled:true});
    assert.equal((await post('/api/export',{dir:process.platform==='win32'?(process.env.SystemRoot||'C:\\Windows'):'/System'})).status,400);
    const started=await post('/api/export');assert.equal(started.status,202,await started.text());
    while(!events.some(e=>e.event==='complete'))await new Promise(resolve=>setTimeout(resolve,5));
    const result=events.find(e=>e.event==='complete').data;
    assert.equal(result.fileName,'test 2026-10-20 12.57.mp4');assert.equal(result.sizeBytes,10);assert.equal(result.durationSec,5);assert.equal(result.width,1920);assert.equal(result.fps,30);assert.equal(result.posterUrl,'/api/export/poster');
    const response=await request('/api/export/download?path=/etc/passwd',{headers:{Range:'bytes=2-5'}});
    assert.equal(response.status,206);assert.equal(response.headers.get('content-range'),'bytes 2-5/10');assert.match(response.headers.get('content-disposition'),/attachment;.*filename\*=UTF-8/);assert.equal(await response.text(),'2345');
    assert.equal((await request('/api/export/download',{headers:{Range:'bytes=100-'}})).status,416);
    assert.equal(await (await request('/api/export/download',{headers:{Range:'bytes=-2'}})).text(),'89');
    assert.equal(await (await request('/api/export/poster')).text(),'poster');
    for(const route of ['/api/reveal','/api/open'])assert.equal((await post(route,{file:'/etc/passwd'})).status,200);
    assert.deepEqual(calls,[{file:result.finalFile,action:'reveal'},{file:result.finalFile,action:'open'}]);
    assert.equal((await request('/api/export/download/%2e%2e%2fetc/passwd')).status,404);
  } finally {await exports.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
