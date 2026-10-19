import { define, string, number, enumeration, color, boolean, POSITIONS, anchor, text, panel, paint, box, sourceRect, motion, measurePlate, fitPlate, drawPlate, plateText, calloutGeometry } from './shared.mjs';
import { EASING } from '../easing.mjs';
const template = define('step-badge', 'Step badge', 'Number and label in a chip.', { number:number(1,0,999), label:string('Open the report',80) }, (ctx, f, p, s) => {
  const em=f.height*.024, diameter=em*1.45;
  const size=measurePlate(ctx,f,[{text:p.label,size:em}],{minWidth:em*4,extraWidth:diameter+em*.5}),r=fitPlate(f,p,size);
  drawPlate(ctx,f,r,size,p.color,true);
  const cx=r.x+size.px+diameter/2, cy=r.y+r.h/2;
  ctx.fillStyle=paint(f,p.color);ctx.beginPath();ctx.arc(cx,cy,diameter/2,0,Math.PI*2);ctx.fill();
  text(ctx,f,String(p.number),cx,cy,em*.85,'onAccent');
  plateText(ctx,f,p.label,cx+diameter/2+em*.5,cy,em,r.w-2*size.px-diameter-em*.5);

});

export const { id, label, help, params, defaults, defaultDuration, draw } = template;
export default template;
