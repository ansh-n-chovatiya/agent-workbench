import { define, string, number, enumeration, color, boolean, POSITIONS, anchor, text, panel, paint, box, sourceRect, motion } from './shared.mjs';
import { EASING } from '../easing.mjs';
const template = define('number-counter', 'Number counter', 'Count between two values with a suffix.', { from:number(0,-1e9,1e9), to:number(100,-1e9,1e9), format:enumeration('integer',['integer','decimal','percent']), suffix:string('users',30) }, (ctx, f, p, s) => {
  const h = f.height;
  const a=anchor(f,p),v=p.from+(p.to-p.from)*EASING.moveInOut(s.progress);const value=p.format==='decimal'?v.toFixed(1):Math.round(v).toString();text(ctx,f,`${value}${p.format==='percent'?'%':''} ${p.suffix}`,a.x,a.y,h*.085,p.color);
});

export const { id, label, help, params, defaults, defaultDuration, draw } = template;
export default template;
