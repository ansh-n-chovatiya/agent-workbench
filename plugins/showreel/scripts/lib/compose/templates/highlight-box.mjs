import { define, string, number, enumeration, color, boolean, POSITIONS, anchor, text, panel, paint, box, sourceRect, motion } from './shared.mjs';
import { EASING } from '../easing.mjs';
const template = define('highlight-box', 'Highlight box', 'Outline a source rectangle with an optional label.', { ...sourceRect, label:string('Selected',80), showLabel:boolean(true) }, (ctx, f, p, s) => {
  const h = f.height;
  const r=box(f,p);ctx.strokeStyle=paint(f,p.color);ctx.lineWidth=h*.005;ctx.beginPath();ctx.roundRect(r.x,r.y,r.w,r.h,h*.008);ctx.stroke();if(p.showLabel){panel(ctx,f,r.x,r.y-h*.045,Math.min(f.width*.3,r.w),h*.04);text(ctx,f,p.label,r.x+h*.01,r.y-h*.024,h*.025,p.color,'left');}
});

export const { id, label, help, params, defaults, defaultDuration, draw } = template;
export default template;
