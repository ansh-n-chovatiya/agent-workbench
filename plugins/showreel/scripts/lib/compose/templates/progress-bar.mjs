import { define, string, number, enumeration, color, boolean, POSITIONS, anchor, text, panel, paint, box, sourceRect, motion, fitPlate } from './shared.mjs';
import { EASING } from '../easing.mjs';
const template = define('progress-bar', 'Progress bar', 'Progress from zero to one hundred with a label.', { label:string('Loading',80), widthPct:number(48,5,90) }, (ctx, f, p, s) => {
  const h = f.height;
  const r=fitPlate(f,p,{w:f.width*p.widthPct/100,h:h*.09}),w=r.w,a={x:r.x+w/2,y:r.y+h*.065};panel(ctx,f,a.x-w/2,a.y,w,h*.025); if(s.progress>0)panel(ctx,f,a.x-w/2,a.y,w*s.progress,h*.025,p.color); text(ctx,f,`${p.label} ${Math.round(s.progress*100)}%`,a.x,a.y-h*.04,h*.029,p.color);
});

export const { id, label, help, params, defaults, defaultDuration, draw } = template;
export default template;
