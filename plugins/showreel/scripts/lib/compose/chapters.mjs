import path from 'node:path';
import { writeFile, rm } from 'node:fs/promises';
const youtubeTime = t => {
  const s=Math.max(0,Math.floor(t)), m=Math.floor(s/60), h=Math.floor(m/60);
  return h ? `${h}:${String(m%60).padStart(2,'0')}:${String(s%60).padStart(2,'0')}` : `${m}:${String(s%60).padStart(2,'0')}`;
};
const vttTime = t => {
  const ms=Math.max(0,Math.round(t*1000));
  return `${String(Math.floor(ms/3600000)).padStart(2,'0')}:${String(Math.floor(ms/60000)%60).padStart(2,'0')}:${String(Math.floor(ms/1000)%60).padStart(2,'0')}.${String(ms%1000).padStart(3,'0')}`;
};
export function chaptersFor(plan) {
  const chapters = (plan.scenes ?? []).filter(s => s.title?.trim()).map(s => ({title:s.title.trim(),start:s.outputStart}));
  // YouTube requires the first chapter at zero; let the first titled chapter include the opening cards.
  if (chapters.length) chapters[0].start=0;
  const txt = chapters.length >= 3 ? chapters.map(c => `${youtubeTime(c.start)} ${c.title}`).join('\n')+'\n' : null;
  const vtt = 'WEBVTT\n\n'+chapters.map((c,i) => `${i+1}\n${vttTime(c.start)} --> ${vttTime(chapters[i+1]?.start ?? plan.timemap.outputDuration)}\n${c.title}\n`).join('\n');
  return {chapters,txt,vtt,notice:txt === null ? 'chapters.txt omitted: at least 3 titled chapters are required.' : null};
}
export async function writeChapters(plan,dir,log=()=>{}) {
  if (!plan.scenes) return;
  const chapters=chaptersFor(plan);
  await writeFile(path.join(dir,'chapters.vtt'),chapters.vtt);
  if (chapters.txt !== null) await writeFile(path.join(dir,'chapters.txt'),chapters.txt);
  else { await rm(path.join(dir,'chapters.txt'),{force:true}); log(chapters.notice); }
  return chapters;
}
