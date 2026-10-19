import { define, string, number, enumeration, color, boolean, POSITIONS, anchor, text, panel, paint, box, sourceRect, motion, fitPlate, overlaySafeArea } from './shared.mjs';
import { EASING } from '../easing.mjs';
const template = define('text-callout', 'Text callout', 'Large phrase with staggered word entrances.', { text:string('Make every moment count',100) }, (ctx, f, p, s) => {
  const words=p.text.split(/\s+/), safe=overlaySafeArea(f,p.placement);
  let size=Math.min(f.height*.065,safe.w*.8/Math.max(1,p.text.length)*1.7);
  ctx.font=`${f.theme.typography.weights.display} ${size}px "${f.theme.typography.family}"`;
  let gap=size*.28,total=words.reduce((v,w)=>v+ctx.measureText(w).width+gap,-gap);
  const scale=Math.min(1,safe.w/total,safe.h/(size*1.5));size*=scale;gap*=scale;total*=scale;
  const r=fitPlate(f,p,{w:total,h:size*1.5});let x=r.x;
  words.forEach((word,i)=>{const v=EASING.enterOut(Math.max(0,Math.min(1,s.progress*8-i*.25)));ctx.save();ctx.globalAlpha*=v;
    text(ctx,f,word,x,r.y+r.h/2+(1-v)*size*.3,size,p.color,'left');ctx.restore();
    ctx.font=`${f.theme.typography.weights.display} ${size}px "${f.theme.typography.family}"`;x+=ctx.measureText(word).width+gap;});

});

export const { id, label, help, params, defaults, defaultDuration, draw } = template;
export default template;
