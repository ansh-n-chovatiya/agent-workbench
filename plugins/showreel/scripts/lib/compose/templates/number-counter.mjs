import { define, string, number, enumeration, color, boolean, POSITIONS, anchor, text, panel, paint, box, sourceRect, motion, fitPlate } from './shared.mjs';
import { EASING } from '../easing.mjs';
const template = define('number-counter', 'Number counter', 'Count between two values with a suffix.', { from:number(0,-1e9,1e9), to:number(100,-1e9,1e9), format:enumeration('integer',['integer','decimal','percent']), suffix:string('users',30) }, (ctx, f, p, s) => {
  const h = f.height;
  const v=p.from+(p.to-p.from)*EASING.moveInOut(s.progress);const value=p.format==='decimal'?v.toFixed(1):Math.round(v).toString();const label=`${value}${p.format==='percent'?'%':''} ${p.suffix}`,size=h*.085;ctx.font=`${f.theme.typography.weights.display} ${size}px "${f.theme.typography.family}"`;const r=fitPlate(f,p,{w:ctx.measureText(label).width,h:size*1.25});text(ctx,f,label,r.x+r.w/2,r.y+r.h/2,Math.min(size,r.w/Math.max(1,ctx.measureText(label).width)*size),p.color);
});

export const { id, label, help, params, defaults, defaultDuration, draw } = template;
export default template;
