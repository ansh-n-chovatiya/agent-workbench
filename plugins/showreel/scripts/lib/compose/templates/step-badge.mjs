import { define, string, number, enumeration, color, boolean, POSITIONS, anchor, text, panel, paint, box, sourceRect, motion } from './shared.mjs';
import { EASING } from '../easing.mjs';
const template = define('step-badge', 'Step badge', 'Number and label in a chip.', { number:number(1,0,999), label:string('Open the report',80) }, (ctx, f, p, s) => {
  const h = f.height;
  const a=anchor(f,p); panel(ctx,f,a.x-f.width*.18,a.y-h*.04,f.width*.36,h*.08); text(ctx,f,`${p.number}  ${p.label}`,a.x,a.y,h*.032,p.color);
});

export const { id, label, help, params, defaults, defaultDuration, draw } = template;
export default template;
