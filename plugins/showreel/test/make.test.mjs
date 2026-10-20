import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, mkdir, rm, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { assertPlan, validatePlan, MINIMAL_PLAN, briefFromPlan } from '../scripts/lib/make-plan.mjs';
import { formatResolvedStep } from '../scripts/lib/guide/pure.mjs';
import { startFixtureServer } from '../scripts/lib/fixture-server.mjs';
const home = await mkdtemp(path.join(os.tmpdir(), 'showreel-make-'));
process.env.SHOWREEL_HOME = home;
const { makeProject, formatMakeReport, parseMakeOptions } = await import('../scripts/lib/make.mjs');
const { projectDir } = await import('../scripts/lib/paths.mjs');
const { addGuideStep } = await import('../scripts/lib/guide/commands.mjs');
const { pendingSecrets } = await import('../scripts/lib/record/preflight.mjs');
const { estimateTokens } = await import('../scripts/lib/meter.mjs');
test.after(() => rm(home, { recursive: true, force: true }));
const plan = () => structuredClone(MINIMAL_PLAN);
const cli = (...args) => execFileSync(process.execPath, ['scripts/showreel.mjs', ...args], { cwd: new URL('../', import.meta.url), env: { ...process.env, SHOWREEL_HOME: home }, encoding: 'utf8' }).trim();
test('strict plan validation collects errors, supplies fixes and a valid minimal example', () => {
  const cases = [null, [], {...plan(),extra:1}, {...plan(),url:'/relative'}, {...plan(),topic:''},
    {...plan(),audience:1}, {...plan(),theme:'x'}, {...plan(),profile:'x'}, {...plan(),captions:'yes'}, {...plan(),voice:1},
    {...plan(),steps:[]}, {...plan(),steps:[null]},
    ...[
      {caption:'',do:[]}, {caption:'a'.repeat(71),do:[]}, {caption:'role=button',do:[]},
      {caption:'ok',narration:'word '.repeat(46),do:[]},
       {caption:'ok',narration:'',do:[]}, {caption:'ok',extra:1},
      ...[null, {}, {click:'',wait:1}, {bad:1}, {goto:'file:///a'}, {goto:1}, {click:''},
        {click:{role:'banana',name:'x'}}, {click:{role:'button',name:'x',extra:1}}, {fill:null},
        {fill:{label:'',value:1}}, {fill:{label:'x',value:{secret:'BAD-NAME'}}},
        {fill:{label:'x',value:{secret:'OK',extra:1}}}, {fill:{label:'x',value:'',extra:1}},
        {scroll:100001}, {scroll:'700'}, {wait:-1}, {wait:60001}, {press:''}
      ].map(a=>({caption:'ok',do:[a]}))
    ].map(s=>({...plan(),steps:[s]}))];
  for (const invalid of cases) {
    assert.equal(validatePlan(invalid).ok,false,JSON.stringify(invalid));
    assert.throws(()=>assertPlan(invalid),e=>e.message.includes('Minimal valid example:') && e.message.includes(JSON.stringify(MINIMAL_PLAN)));
  }
  assert.equal(validatePlan({...plan(),url:'',topic:'',theme:'bad',steps:[{caption:'',do:[{wait:-1},{press:''}]}]}).errors.length,6);
  assert.equal(validatePlan(MINIMAL_PLAN).ok,true);
});
test('make options reject duplicates, invalid enums and missing values', () => {
  for (const f of [[],['--name'],['--name','x','--plan','p','--record','--record'],...['theme','format','profile'].map(k=>['--name','x','--plan','p','--'+k,'bad'])]) assert.throws(()=>parseMakeOptions(f));
  assert.equal(parseMakeOptions(['--name','demo','--plan','p','--record']).record,true);
});
test('five fixture steps use injected dependencies, reuse work and never persist secrets', async () => {
  const fixture = await startFixtureServer();
  try {
    const p = {url:fixture.url,topic:'Fixture',brief:{targetSeconds:30,captions:{enabled:true}},steps:[
      {caption:'Open Fieldnotes',do:[{goto:'/'}]},
      {caption:'Share the plan',do:[{click:{role:'tab',name:'Share'}}]},
      {caption:'Scroll the page',do:[{scroll:700},{wait:800}]},
      {caption:'Enter your name',do:[{fill:{label:'Name',value:'Demo'}},{press:'Enter'}]},
      {caption:'Sign in',do:[{fill:{label:'Password',value:{secret:'MAKE_PASSWORD'}}}]}
    ]};
    process.env.MAKE_PASSWORD='never-persist-this-value';
    const calls={resolve:0,record:0,render:0}, finalFile=path.join(home,'exports','demo.mp4');
    const deps={
      resolveGuide:async({guide,headless})=>{
        calls.resolve++; assert.equal(headless,true); assert.ok(!JSON.stringify(guide).includes(process.env.MAKE_PASSWORD));
        return {version:1,url:guide.url,failures:[],steps:guide.steps.map((s,i)=>formatResolvedStep(s,i,s.candidates[0]??null,'unique'))};
      },
      recordScenario:async({name,profile})=>{
        calls.record++; assert.equal(profile,'desktop');
        const sc=JSON.parse(await readFile(path.join(projectDir(name),'scenario.json')));
        assert.equal(sc.steps.length,5); assert.deepEqual(pendingSecrets(sc,process.env),[]); assert.equal(pendingSecrets(sc,{}).length,1);
        const runDir=path.join(projectDir(name),'runs','fake'); await mkdir(runDir,{recursive:true});
        const record={runId:'fake',durationSec:12}; await writeFile(path.join(runDir,'record.json'),JSON.stringify(record));
        return {record,runDir};
      },
      renderRun:async({exportDir,runId})=>{
        calls.render++; assert.equal(runId,'fake'); assert.equal(exportDir,path.dirname(finalFile));
        await mkdir(exportDir,{recursive:true}); await writeFile(finalFile,'fake video');
        return {finalFile,durationSec:12,audio:{measured:{integratedLufs:-16,truePeakDb:-1}}};
      }
    };
    const opts={name:'make-demo',plan:p,record:true,render:true,to:path.dirname(finalFile)};
    const first=await makeProject(opts,deps); assert.equal(first.ok,true,JSON.stringify(first));
    assert.ok(estimateTokens(formatMakeReport(first)+'\n')<=600);
    const stamp=(await stat(path.join(projectDir(opts.name),'storyboard.json'))).mtimeMs;
    const second=await makeProject(opts,deps); assert.equal(second.ok,true,JSON.stringify(second));
    assert.deepEqual(calls,{resolve:1,record:1,render:1}); assert.equal((await stat(path.join(projectDir(opts.name),'storyboard.json'))).mtimeMs,stamp);
    for (const file of ['brief.json','guide.json','guide.resolved.json','storyboard.json','scenario.json','make.state.json']) assert.ok(!(await readFile(path.join(projectDir(opts.name),file),'utf8')).includes(process.env.MAKE_PASSWORD));
    const sc=JSON.parse(await readFile(path.join(projectDir(opts.name),'scenario.json')));
    assert.deepEqual(sc.steps[2].actions,[{type:'scroll',deltaY:700},{type:'wait',ms:800}]);
    assert.equal(cli('brief','questions','--name',opts.name),'all answered');
    assert.equal(cli('storyboard','draft','--name',opts.name),'unchanged');
    delete process.env.MAKE_PASSWORD;
  } finally { await fixture.close(); }
});
test('failure identifies step and action; default output stays capped with a valid example',async()=>{
  const result=await makeProject({name:'failure',plan:plan()},{resolveGuide:async()=>({steps:[],failures:[{i:0,why:'no match; closest candidates: Home, Features, Pricing'}]})});
  assert.equal(result.ok,false); assert.match(result.error,/step 1, action 1/); assert.match(result.error,/plan.steps\[0\].do/);
  const invalid=await makeProject({name:'invalid',plan:{steps:Array.from({length:100},()=>({caption:'',do:[{wait:-1}]}))}});
  assert.ok(invalid.error.split('\n').length>100); assert.ok(estimateTokens(formatMakeReport(invalid)+'\n')<=600); assert.match(formatMakeReport(invalid),/Minimal valid example/);
});
test('guide batch JSON/file and single forms work; invalid batches are atomic and include pasteable usage',async()=>{
  cli('brief','init','--name','batch','--url','http://localhost:3000','--topic','Demo');
  const items=[{action:'click',selector:'text=Features',label:'Features'},{action:'fill',selector:'label=Name',label:'Name',value:'Demo'}];
  assert.equal(await addGuideStep(['--name','batch','--json',JSON.stringify(items)]),2);
  const file=path.join(home,'batch.json'); await writeFile(file,JSON.stringify(items));
  assert.equal(await addGuideStep(['--name','batch','--file',file]),4);
  assert.equal(await addGuideStep(['--name','batch','--action','press','--selector',':focus','--label','Enter','--key','Enter']),5);
  for (const flags of [[],['--name','batch','--action','click'],['--name','batch','--json','{}'],['--name','batch','--json','[{},null]'],['--name','batch','--file',file,'--json','[]']]) await assert.rejects(addGuideStep(flags),e=>e.message.includes('Usage:')&&e.message.includes('Example: showreel guide add'));
  assert.equal(JSON.parse(await readFile(path.join(projectDir('batch'),'guide.json'))).steps.length,5);
});
test('closest candidates are deterministic, deduplicated and limited to three', async () => {
  const { closestCandidates } = await import('../scripts/lib/guide/resolver.mjs');
  assert.deepEqual(closestCandidates(['Home','Features','Pricing','Features','Feature','Settings'],'Featur'),['Feature','Features','Home']);
});
test('global press has a body fallback and secret names survive scenario validation without values', async () => {
  const { guideFromPlan } = await import('../scripts/lib/make-plan.mjs');
  const { validateScenario } = await import('../scripts/lib/scenario.mjs');
  const g = guideFromPlan({...plan(),steps:[{caption:'Go',do:[{press:'Enter'}]}]}).guide;
  assert.deepEqual(g.steps[0].candidates,[':focus','body']);
  const sc={version:1,baseURL:plan().url,steps:[{id:'s1',caption:'Enter password',narration:null,zoom:'auto',highlight:false,holdMs:null,actions:[{type:'fill',selector:'input',sensitive:true,value:null,secretEnv:'BAD-NAME'}]}]};
  assert.match(validateScenario(sc).errors.join(),/secretEnv/);
});
test('invalid-plan CLI JSON is parseable and default errors obey 600 tokens',async()=>{
  const file=path.join(home,'invalid-plan.json');await writeFile(file,JSON.stringify({steps:Array.from({length:200},()=>({caption:'',do:[]}))}));
  for(const json of [false,true]) {
    try { cli('make','--name','cli-invalid','--plan',file,...(json?['--json']:[]));assert.fail('must fail'); }
    catch(e) {
      if(json){const report=JSON.parse(e.stdout);assert.equal(report.ok,false);assert.ok(report.error.includes('steps[199]'));}
      else {assert.ok(estimateTokens(e.stdout)<=600);assert.match(e.stdout,/Minimal valid example/);}
    }
  }
});
test('render without a completed run gives an actionable recording fix',async()=>{
  const result=await makeProject({name:'missing-run',plan:plan(),render:true},{resolveGuide:async({guide})=>({version:1,url:guide.url,failures:[],steps:guide.steps.map((s,i)=>formatResolvedStep(s,i,null,'action'))})});
  assert.equal(result.ok,false);assert.match(result.error,/--record --render/);
});

test('plan defaults and every boolean shorthand normalize without mutating the plan', () => {
  const defaults = briefFromPlan(plan());
  assert.equal(defaults.captions.enabled, true);
  assert.equal(defaults.voice.enabled, false);
  assert.equal(defaults.theme, 'clean');
  for (const key of ['captions', 'voice']) for (const enabled of [true, false]) {
    for (const legacy of [true, false]) {
      const p = { ...plan(), ...(legacy ? { brief: { [key]: enabled } } : { [key]: enabled }) };
      const before = structuredClone(p), warnings = [];
      assert.equal(validatePlan(p).ok, true);
      const brief = briefFromPlan(p, warning => warnings.push(warning));
      assert.equal(brief[key].enabled, enabled);
      assert.equal(warnings.length, legacy ? 1 : 0);
      assert.deepEqual(p, before);
    }
  }
  const overrides = briefFromPlan({ ...plan(), theme: 'bold', captions: false, voice: true,
    brief: { theme: 'dark', captions: { enabled: true, mode: 'overlay' }, voice: { enabled: false, language: 'fr' } } });
  assert.equal(overrides.theme, 'bold');
  assert.deepEqual(overrides.captions, { enabled: false, mode: 'overlay' });
  assert.equal(overrides.voice.enabled, true); assert.equal(overrides.voice.language, 'fr');
});

test('invalid legacy answers are dropped with one warning per field and valid answers survive', () => {
  const warnings = [];
  const p = { ...plan(), brief: { targetSeconds: 1, odd: true, voice: { enabled: 'yes' },
    captions: { mode: 'bad' }, music: { mode: 'file' }, titleCard: null, theme: 'dark', audience: 'Teammates' } };
  assert.equal(validatePlan(p).ok, true);
  const brief = briefFromPlan(p, warning => warnings.push(warning));
  assert.equal(warnings.length, 6);
  for (const key of ['targetSeconds', 'odd', 'voice', 'captions', 'music', 'titleCard']) {
    assert.equal(warnings.filter(w => w.startsWith(`ignored plan field brief.${key}: `)).length, 1);
  }
  assert.equal(brief.targetSeconds, 60); assert.equal(brief.voice.enabled, false);
  assert.equal(brief.captions.mode, 'band'); assert.equal(brief.music.mode, 'none');
  assert.equal(brief.titleCard.enabled, true); assert.equal(brief.theme, 'dark');
  assert.equal(brief.audience, 'Teammates');
  for (const invalid of [null, [], 'bad', 3]) {
    const w = [];
    assert.equal(validatePlan({ ...plan(), brief: invalid }).ok, true);
    assert.equal(briefFromPlan({ ...plan(), brief: invalid }, x => w.push(x)).voice.enabled, false);
    assert.match(w[0], /^ignored plan field brief\.\*: must be an object$/);
  }
});

test('the measured boolean brief succeeds through make and prints its warnings', async () => {
  const p = { ...plan(), brief: { captions: true, voice: false } };
  const result = await makeProject({ name: 'trace-brief', plan: p }, {
    resolveGuide: async ({ guide }) => ({ version: 1, url: guide.url, failures: [],
      steps: guide.steps.map((s, i) => formatResolvedStep(s, i, null, 'action')) }),
  });
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.warnings.length, 2);
  const output = formatMakeReport(result);
  assert.match(output, /^ignored plan field brief\.captions: .+\nignored plan field brief\.voice: .+/);
  const saved = JSON.parse(await readFile(path.join(projectDir('trace-brief'), 'brief.json')));
  assert.equal(saved.captions.enabled, true); assert.equal(saved.voice.enabled, false);
});
