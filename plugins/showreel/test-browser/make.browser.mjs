// Real Chromium integration. Intentionally not part of npm test.
// Run with npm run test:browser on a browser-enabled machine.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, stat, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startFixtureServer } from '../scripts/lib/fixture-server.mjs';

test('make CLI records and renders five fixture steps with caption sidecars', { timeout: 300000 }, async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), 'showreel-make-browser-'));
  const fixture = await startFixtureServer();
  try {
    const home = path.join(temp,'home'), exports = path.join(temp,'exports'), file = path.join(temp,'plan.json');
    await mkdir(exports);
    const steps = [
      { caption:'Welcome to Fieldnotes', do:[{goto:'/'}] },
      { caption:'Share your plan', do:[{click:{role:'tab',name:'Share'}}] },
      { caption:'Review the work', do:[{click:{role:'tab',name:'Review'}}] },
      { caption:'Explore the features', do:[{click:'Features'}] },
      { caption:'Compare the plans', do:[{click:'Pricing'}] },
    ];
    await writeFile(file,JSON.stringify({url:fixture.url,topic:'Explore Fieldnotes',steps}));
    // Async child keeps the fixture HTTP server responsive.
    const result = await new Promise((resolve,reject)=>{
      const child = spawn(process.execPath, [
        fileURLToPath(new URL('../scripts/showreel.mjs',import.meta.url)),
        'make','--name','browser-make','--plan',file,'--record','--render','--to',exports,'--json',
      ], { env:{...process.env,SHOWREEL_HOME:home}, stdio:['ignore','pipe','pipe'] });
      let stdout='',stderr='';
      child.stdout.on('data',data=>{stdout+=data;}); child.stderr.on('data',data=>{stderr+=data;});
      const timer=setTimeout(()=>{child.kill('SIGKILL');reject(new Error('make timeout: '+stderr));},285000);
      child.on('error',e=>{clearTimeout(timer);reject(e);});
      child.on('close',code=>{clearTimeout(timer);resolve({code,stdout,stderr});});
    });
    assert.equal(result.code,0,result.stderr+'\n'+result.stdout);
    const report=JSON.parse(result.stdout); assert.equal(report.ok,true);
    assert.ok((await stat(report.finalFile)).size>0);
    assert.equal(path.dirname(report.finalFile),exports);
    const dir=path.join(home,'projects','browser-make');
    assert.equal(JSON.parse(await readFile(path.join(dir,'scenario.json'))).steps.length,5);
    assert.equal(JSON.parse(await readFile(path.join(dir,'storyboard.json'))).steps.length,5);
    const srt=await readFile(report.finalFile.replace(/\.mp4$/,'.srt'),'utf8');
    for (const step of steps) assert.ok(srt.includes(step.caption),step.caption);
    assert.ok(report.durationSec>0);
  } finally { await fixture.close(); await rm(temp,{recursive:true,force:true}); }
});
