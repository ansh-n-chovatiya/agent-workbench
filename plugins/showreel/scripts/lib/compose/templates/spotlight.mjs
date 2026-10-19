import { define, string, number, enumeration, color, boolean, POSITIONS, anchor, text, panel, paint, box, sourceRect, motion } from './shared.mjs';
import { EASING } from '../easing.mjs';
const template = define('spotlight', 'Spotlight', 'Dim the canvas around a source rectangle or circle. x/y are the TOP-LEFT in page pixels at capture scale 1; origin=center makes them the centre. pad adds breathing room.', { ...sourceRect, shape:enumeration('rect',['rect','circle']), dim:number(.65,0,1), softness:number(12,0,80) }, (ctx, f, p, s) => {
  const h = f.height;
  const r=box(f,p); ctx.fillStyle='#000000'; ctx.globalAlpha*=p.dim; ctx.beginPath();ctx.rect(0,0,f.width,h); if(p.shape==='circle')ctx.arc(r.x+r.w/2,r.y+r.h/2,Math.min(r.w,r.h)/2,0,Math.PI*2);else ctx.roundRect(r.x,r.y,r.w,r.h,h*.012); ctx.fill('evenodd'); if(p.softness){ctx.shadowColor='#000000';ctx.shadowBlur=p.softness*h/1080;ctx.strokeStyle='#000000';ctx.lineWidth=2;ctx.beginPath();if(p.shape==='circle')ctx.arc(r.x+r.w/2,r.y+r.h/2,Math.min(r.w,r.h)/2,0,Math.PI*2);else ctx.roundRect(r.x,r.y,r.w,r.h,h*.012);ctx.stroke();}
});

export const { id, label, help, params, defaults, defaultDuration, draw } = template;
export default template;
