import { define, string, number, enumeration, color, boolean, POSITIONS, anchor, text, panel, paint, box, sourceRect, motion, measurePlate, fitPlate, drawPlate, plateText, calloutGeometry } from './shared.mjs';
import { EASING } from '../easing.mjs';
const template = define('callout-arrow', 'Callout arrow', 'Label with an arrow to a source point.', { position:{type:'position',values:['auto',...POSITIONS],default:'auto'}, x:number(640,0,100000), y:number(360,0,100000), text:string('Look here',100) }, (ctx, f, p, s) => {
  const em=f.height*.024,size=measurePlate(ctx,f,[{text:p.text,size:em}],{minWidth:em*4});
  const {plate:r,start,target}=calloutGeometry(f,p,size,f.mapSource(p));
  const angle=Math.atan2(target.y-start.y,target.x-start.x), head=12*f.height/1080;
  ctx.strokeStyle=paint(f,p.color);ctx.lineWidth=3*f.height/1080;ctx.lineCap='round';ctx.lineJoin='round';
  ctx.beginPath();ctx.moveTo(start.x,start.y);ctx.lineTo(target.x,target.y);
  ctx.moveTo(target.x-Math.cos(angle-.5)*head,target.y-Math.sin(angle-.5)*head);ctx.lineTo(target.x,target.y);
  ctx.lineTo(target.x-Math.cos(angle+.5)*head,target.y-Math.sin(angle+.5)*head);ctx.stroke();
  drawPlate(ctx,f,r,size,p.color);plateText(ctx,f,p.text,r.x+size.px,r.y+r.h/2,em,r.w-2*size.px);

});

export const { id, label, help, params, defaults, defaultDuration, draw } = template;
export default template;
