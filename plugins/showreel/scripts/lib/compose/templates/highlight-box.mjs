import { define, string, number, enumeration, color, boolean, POSITIONS, anchor, text, panel, paint, box, sourceRect, motion, measurePlate, fitPlate, drawPlate, plateText } from './shared.mjs';
import { EASING } from '../easing.mjs';
const template = define('highlight-box', 'Highlight box', 'Outline a source rectangle with an optional label. x/y are the TOP-LEFT in page pixels at capture scale 1; origin=center makes them the centre. pad adds breathing room.', { ...sourceRect, label:string('Selected',80), showLabel:boolean(true) }, (ctx, f, p, s) => {
  const h = f.height;
  const r=box(f,p);ctx.strokeStyle=paint(f,p.color);ctx.lineWidth=h*.005;ctx.beginPath();ctx.roundRect(r.x,r.y,r.w,r.h,h*.008);ctx.stroke();if(p.showLabel){const em=h*.024,size=measurePlate(ctx,f,[{text:p.label,size:em}],{minWidth:em*3});const plate=fitPlate(f,{...p,position:'bottom-left'},size,{x:r.x,y:r.y});drawPlate(ctx,f,plate,size,p.color);plateText(ctx,f,p.label,plate.x+size.px,plate.y+plate.h/2,em,plate.w-2*size.px);}
});

export const { id, label, help, params, defaults, defaultDuration, draw } = template;
export default template;
