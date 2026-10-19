import { define, string, number, enumeration, color, boolean, POSITIONS, anchor, text, panel, paint, box, sourceRect, motion } from './shared.mjs';
import { EASING } from '../easing.mjs';
const template = define('callout-arrow', 'Callout arrow', 'Label with an arrow to a source point.', { position:{type:'position',values:POSITIONS,default:'top-center'}, x:number(640,0,100000), y:number(360,0,100000), text:string('Look here',100) }, (ctx, f, p, s) => {
  const h = f.height;
  const a=anchor(f,p),b=f.mapSource(p),angle=Math.atan2(b.y-a.y,b.x-a.x); ctx.strokeStyle=paint(f,p.color);ctx.lineWidth=h*.004;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.moveTo(b.x-Math.cos(angle-.5)*h*.025,b.y-Math.sin(angle-.5)*h*.025);ctx.lineTo(b.x,b.y);ctx.lineTo(b.x-Math.cos(angle+.5)*h*.025,b.y-Math.sin(angle+.5)*h*.025);ctx.stroke();panel(ctx,f,a.x-f.width*.13,a.y-h*.06,f.width*.26,h*.055);text(ctx,f,p.text,a.x,a.y-h*.032,h*.027,p.color);
});

export const { id, label, help, params, defaults, defaultDuration, draw } = template;
export default template;
