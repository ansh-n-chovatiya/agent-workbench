import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, symlink, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { SETTINGS, EXCLUDED, settingFor } from '../scripts/lib/compose/settings-schema.mjs';
import { compositionPaths, resolveComposition, validateComposition, changeComposition, SETTING_RANGES, SETTING_ENUMS } from '../scripts/lib/compose/composition.mjs';
import { authorized, validHost, validOrigin, sessionCookie, stripToken, safeRelativePath, parseRange, formatSSE } from '../scripts/lib/editor/http.mjs';
import { contained, safeFile, writeCompositionAtomic } from '../scripts/lib/editor/files.mjs';
import { openerArgs } from '../scripts/lib/editor/opener.mjs';
function composition() {
  return resolveComposition({run:{id:'test'},frame:{background:{image:'background.png'}},cards:Object.fromEntries(['title','outro'].map(k => [k,{enabled:false,logo:{image:'logo.png',heightPct:10},background:{image:'background.png'}}])),cursor:{custom:{heightPct:3.4,
    ...Object.fromEntries(['arrow','hand','text'].map(s => [s,{image:'cursor.png',hotspot:{x:0,y:0}}]))}}});
}
test('schema covers default and optional paths with documented exclusions', () => {
  const covered = new Set(SETTINGS.map(s => s.path)); assert.equal(covered.size,SETTINGS.length);
  for (const s of EXCLUDED) { assert.ok(s.reason.trim()); assert.ok(!covered.has(s.path)); covered.add(s.path); }
  for (const c of [{},composition(),{captions:{cues:[]},cards:{title:{logo:{image:'logo.png',heightPct:10}}}}])
    for (const p of Object.keys(compositionPaths(c))) assert.ok(covered.has(p),p);
  for (const s of SETTINGS) {
    assert.equal(settingFor(s.path),s); assert.ok(s.label.trim()); assert.ok(s.help.trim());
    assert.ok(['look','cursor','zoom','captions','cards','output','audio'].includes(s.group),s.path);
    assert.ok(['number','slider','toggle','select','color','text','image','gradient'].includes(s.control));
    assert.equal(typeof s.advanced,'boolean');
  }
  assert.equal(settingFor('missing'),undefined);
});
test('schema ranges match validator endpoints and reject values outside them', () => {
  for (const [p,range] of Object.entries(SETTING_RANGES)) {
    for (const key of ['min','max','step']) assert.equal(settingFor(p)[key],range[key],p);
    for (const value of [range.min,range.max]) {
      const result = validateComposition(changeComposition(composition(),p,value));
      assert.ok(result.ok,`${p}=${value}: ${result.errors.join('; ')}`);
    }
    for (const value of [range.min-1,range.max+1]) assert.ok(!validateComposition(changeComposition(composition(),p,value)).ok,p);
  }
});
test('schema options equal validator enums and every option validates', () => {
  for (const [p,options] of Object.entries(SETTING_ENUMS)) {
    assert.deepEqual(settingFor(p).options,options,p);
    for (const value of options) {
      const result = validateComposition(changeComposition(composition(),p,value)); assert.ok(result.ok,`${p}: ${result.errors.join('; ')}`);
    }
    assert.ok(!validateComposition(changeComposition(composition(),p,'invalid-option')).ok,p);
  }
});
test('tokens accept query, bearer or cookie, and strip only token parameters', () => {
  for (const request of [{url:'/?token=abc',headers:{}},{url:'/',headers:{authorization:'Bearer abc'}},{url:'/',headers:{cookie:'other=x; showreel_editor=abc'}}]) assert.ok(authorized(request,'abc'));
  for (const headers of [{},{authorization:'abc'},{cookie:'showreel_editor=abcd'},{cookie:'fake_showreel_editor=abc'}]) assert.ok(!authorized({url:'/',headers},'abc'));
  assert.equal(stripToken('/?x=1&token=abc&y=2'),'/?x=1&y=2'); assert.match(sessionCookie('abc'),/HttpOnly; SameSite=Strict/);
});
test('Host and Origin rules restrict the bound loopback origins', () => {
  for (const host of ['127.0.0.1:1234','localhost:1234']) assert.ok(validHost(host,1234));
  for (const host of [undefined,'127.0.0.1','localhost:1235','example.com:1234','127.0.0.1:1234.example.com']) assert.ok(!validHost(host,1234));
  assert.ok(validOrigin(undefined,'localhost:1234','PUT')); assert.ok(validOrigin('http://localhost:1234','localhost:1234','POST'));
  assert.ok(validOrigin('https://example.com','localhost:1234','GET'));
  for (const origin of ['null','http://127.0.0.1:1234','https://example.com','https://localhost:1234']) assert.ok(!validOrigin(origin,'localhost:1234','PUT'));
});
test('Range parsing handles suffix, open ended, clamped and unsafe ranges', () => {
  assert.equal(parseRange(undefined,100),null);
  for (const [value,start,end] of [['bytes=0-9',0,9],['bytes=90-',90,99],['bytes=-10',90,99],['bytes=90-200',90,99],['bytes=-200',0,99]]) assert.deepEqual(parseRange(value,100),{start,end});
  for (const value of ['bytes=-0','bytes=-','bytes=100-','bytes=9-1','bytes=0-1,4-5','bytes=9007199254740992-','bytes=-9007199254740992','items=0-1','bytes=1.2-3']) assert.equal(parseRange(value,100),false,value);
  assert.equal(parseRange('bytes=0-',0),false);
});
test('paths reject encoded traversal, absolute paths, malformed escapes and sibling prefixes', () => {
  assert.equal(safeRelativePath('images/logo%20one.png'),'images/logo one.png');
  for (const p of ['../x','%2e%2e/x','a/%2e%2e/x','/x','a%5c..%5cx','%252e%252e/x','a//x','a/./x','C:/x','a%00x','%ZZ','https://example.com/x']) assert.equal(safeRelativePath(p),null,p);
  assert.ok(contained('/project','/project/image.png')); assert.ok(!contained('/project','/project-other/x'));
});
test('safeFile rejects symlink escapes; atomic writes replace symlinks without following them', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(),'showreel-files-'));
  try {
    const project = path.join(dir,'project'); await mkdir(project); await writeFile(path.join(dir,'outside.json'),'outside');
    await symlink(path.join(dir,'outside.json'),path.join(project,'composition.json'));
    await assert.rejects(safeFile(project,'composition.json'),/inside/);
    await writeCompositionAtomic(project,{version:1});
    assert.deepEqual(JSON.parse(await readFile(await safeFile(project,'composition.json'),'utf8')),{version:1});
    assert.equal(await readFile(path.join(dir,'outside.json'),'utf8'),'outside');
  } finally { await rm(dir,{recursive:true,force:true}); }
});
test('SSE escapes untrusted text and rejects event-name injection', () => {
  assert.equal(formatSSE('progress',{frame:2,total:3}),'event: progress\ndata: {"frame":2,"total":3}\n\n');
  assert.equal(formatSSE('log',{message:'hello\nevent: fake'}).split('\n').length,4);
  assert.throws(() => formatSSE('x\nevent: injected',{}));
});
test('browser opener uses fixed argv on all platforms', () => {
  const url = 'http://127.0.0.1:1234/?token=abc';
  assert.deepEqual(openerArgs(url,'darwin'),['open',[url]]); assert.deepEqual(openerArgs(url,'win32'),['cmd',['/c','start','',url]]);
  assert.deepEqual(openerArgs(url,'linux'),['xdg-open',[url]]);
});

test('export job serializes exports, forwards progress, cancels and recovers after errors', async () => {
  const { createExportJob } = await import('../scripts/lib/editor/export-job.mjs');
  const events = []; let finish, signal;
  const job = createExportJob({render:options => {
    signal = options.signal; options.onProgress({frame:1,total:2}); options.log('Rendering');
    return new Promise(resolve => { finish = resolve; });
  },onEvent:(event,data) => events.push({event,data})});
  assert.equal(job.start({name:'test'}),true); assert.equal(job.start({name:'test'}),false);
  await Promise.resolve(); assert.equal(signal.aborted,false); job.cancel(); assert.equal(signal.aborted,true);
  finish({finalFile:'final.mp4'}); await job.close(); assert.equal(job.running,false);
  assert.ok(events.some(e => e.event === 'progress' && e.data.frame === 1));
  assert.ok(events.some(e => e.event === 'log')); assert.ok(events.some(e => e.event === 'cancelled'));
  const done = createExportJob({render:async () => ({finalFile:'final.mp4'}),onEvent:event => events.push({event})});
  done.start({});
  // Wait for natural completion; close itself cancels active exports.
  await new Promise(resolve => setImmediate(resolve)); assert.equal(done.running,false);
  assert.ok(events.some(e => e.event === 'complete'));
  const failed = createExportJob({render:async () => {throw new Error('Encoder failed');},onEvent:(event,data) => events.push({event,data})});
  assert.equal(failed.start({}),true); await new Promise(resolve => setImmediate(resolve));
  assert.ok(events.some(e => e.event === 'error' && e.data.message === 'Encoder failed')); assert.equal(failed.running,false);
});
test('renderRun honours an already aborted signal or cancel flag before IO', async () => {
  const { renderRun } = await import('../scripts/lib/compose/render.mjs');
  await assert.rejects(renderRun({signal:{aborted:true}}),/Render aborted/);
  await assert.rejects(renderRun({isCancelled:() => true}),/Render aborted/);
});

test('body reader limits retained bytes and reports oversized bodies without a socket', async () => {
  const { readBody } = await import('../scripts/lib/editor/body.mjs');
  const { Readable } = await import('node:stream');
  assert.equal((await readBody(Readable.from([Buffer.from('abc'),Buffer.from('def')]),6)).toString(),'abcdef');
  await assert.rejects(readBody(Readable.from([Buffer.alloc(1024*1024),Buffer.from('x')])),error => error.statusCode === 413);
});
