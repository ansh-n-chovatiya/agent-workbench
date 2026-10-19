import { define, string, number, enumeration, color, boolean, POSITIONS, anchor, text, panel, paint, box, sourceRect, motion } from './shared.mjs';
import { EASING } from '../easing.mjs';
const template = define('animated-gradient', 'Animated gradient', 'Moving colour band behind a canvas area.', { widthPct:number(70,1,100), heightPct:number(20,1,100), color2:color('surface') }, (ctx, f, p, s) => {
  const h = f.height;
  const a=anchor(f,p),w=f.width*p.widthPct/100,bh=h*p.heightPct/100;const shift=(EASING.moveInOut(s.progress)-.5)*w*.4;const g=ctx.createLinearGradient(a.x-w/2+shift,a.y,a.x+w/2+shift,a.y+bh);g.addColorStop(0,paint(f,p.color));g.addColorStop(1,paint(f,p.color2));ctx.fillStyle=g;ctx.fillRect(a.x-w/2,a.y-bh/2,w,bh);
});

export const { id, label, help, params, defaults, defaultDuration, draw } = template;
export default template;
