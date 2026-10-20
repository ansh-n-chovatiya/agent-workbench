import { projectDir } from './paths.mjs';
import { readScenes, validateScenesInProject, writeScenesAtomic } from './scenes.mjs';

export async function scenesCommand(flags, log = console.log) {
  const [sub,...rest] = flags;
  const specs = {list:['--json'],add:['--run','--title','--transition','--duration'],remove:['--id'],move:['--id','--to'],set:['--id','--path','--value'],validate:[]};
  if (!Object.hasOwn(specs,sub ?? '')) throw new Error('Usage: scenes list|add|remove|move|set|validate --name N');
  const options = {};
  for (let i=0;i<rest.length;i+=2) {
    if (rest[i] === '--json' && sub === 'list') { options['--json'] = true; i--; continue; }
    if (!['--name',...specs[sub]].includes(rest[i]) || options[rest[i]] !== undefined || rest[i+1] === undefined || rest[i+1].startsWith('--')) throw new Error(`Invalid option: ${rest[i]}`);
    options[rest[i]] = rest[i+1];
  }
  if (!options['--name']) throw new Error('--name is required');
  const dir = projectDir(options['--name']), data = await readScenes(dir) ?? {version:1,scenes:[]};
  if (sub === 'list') { log(options['--json'] || process.argv.includes('--verbose') ? JSON.stringify(data,null,2) : `${data.scenes.length} scenes\n${data.scenes.map(s => `${s.id}: ${s.run}`).join('\n')}\nUse --json for details.`); return data; }
  if (sub === 'validate') {
    const report = await validateScenesInProject(dir,data);
    report.warnings.forEach(w => log(`warning: ${w}`));
    if (!report.ok) throw new Error(report.errors.join('\n'));
    log('ok'); return report;
  }
  if (sub === 'add') {
    if (!options['--run']) throw new Error('--run is required');
    let n=1; while (data.scenes.some(s => s.id === `sc${n}`)) n++;
    data.scenes.push({id:`sc${n}`,run:options['--run'],...(options['--title'] !== undefined ? {title:options['--title']} : {}),
      transition:{type:options['--transition'] ?? 'cut',durationSec:Number(options['--duration'] ?? 0.5)}});
  } else {
    const index = data.scenes.findIndex(s => s.id === options['--id']);
    if (index < 0) throw new Error(`Unknown scene: ${options['--id']}`);
    if (sub === 'remove') data.scenes.splice(index,1);
    if (sub === 'move') {
      const to = Number(options['--to']);
      if (options['--to'] === undefined || !Number.isInteger(to) || to < 0 || to >= data.scenes.length) throw new Error('--to must be a zero-based scene index');
      data.scenes.splice(to,0,data.scenes.splice(index,1)[0]);
    }
    if (sub === 'set') {
      const keys = options['--path']?.split('.');
      if (!keys || !/^(id|run|title|storyboard|trims|speeds|transition(?:\.(?:type|durationSec))?)$/.test(options['--path'])) throw new Error('Unsupported scene path');
      if (options['--value'] === undefined) throw new Error('--value JSON is required');
      const value = JSON.parse(options['--value']);
      let target=data.scenes[index]; for (const k of keys.slice(0,-1)) target=target[k] ??= {};
      target[keys.at(-1)]=value;
    }
  }
  const report = await writeScenesAtomic(dir,data);
  report.warnings.forEach(w => log(`warning: ${w}`)); log('ok'); return data;
}
