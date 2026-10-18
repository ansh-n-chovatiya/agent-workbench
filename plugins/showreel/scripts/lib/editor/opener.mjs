import { spawn } from 'node:child_process';
export function openerArgs(target, platform = process.platform) {
  if (platform === 'darwin') return ['open',[target]];
  if (platform === 'win32') return ['cmd',['/c','start','',target]];
  return ['xdg-open',[target]];
}
export async function openDefault(target) {
  const [command,args] = openerArgs(target);
  await new Promise((resolve,reject) => {
    const child = spawn(command,args,{stdio:'ignore',shell:false});
    child.once('error',reject); child.once('exit',code => code === 0 ? resolve() : reject(new Error(`${command} exited with ${code}`)));
  });
}
