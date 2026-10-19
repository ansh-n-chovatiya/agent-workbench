import { define, string, number, enumeration, color, boolean, POSITIONS, anchor, text, panel, paint, box, sourceRect, motion } from './shared.mjs';
import { EASING } from '../easing.mjs';
const template = define('text-callout', 'Text callout', 'Large phrase with staggered word entrances.', { text:string('Make every moment count',100) }, (ctx, f, p, s) => {
  const h = f.height;
  const a=anchor(f,p),words=p.text.split(/\s+/),size=Math.min(h*.065,f.width*.8/Math.max(1,p.text.length)*1.7);ctx.font=`${f.theme.typography.weights.display} ${size}px "${f.theme.typography.family}"`;const gap=size*.28,total=words.reduce((v,w)=>v+ctx.measureText(w).width+gap,-gap);let x=a.x-total/2;words.forEach((word,i)=>{const v=EASING.enterOut(Math.max(0,Math.min(1,s.progress*8-i*.25)));ctx.save();ctx.globalAlpha*=v;text(ctx,f,word,x,a.y+(1-v)*size*.3,size,p.color,'left');ctx.restore();x+=ctx.measureText(word).width+gap;});
});

export const { id, label, help, params, defaults, defaultDuration, draw } = template;
export default template;
