import { define, string, number, enumeration, color, boolean, POSITIONS, anchor, text, panel, paint, box, sourceRect, motion } from './shared.mjs';
import { EASING } from '../easing.mjs';
const template = define('logo-sting', 'Logo sting', 'Text mark or preloaded brand logo with a gentle reveal.', { text:string('SHOWREEL',60), logo:string('brand',120), useLogo:boolean(false) }, (ctx, f, p, s) => {
  const h = Math.min(f.height,f.width*1.25);
  const a=anchor(f,p),scale=.92+.08*motion(s);ctx.translate(a.x,a.y);ctx.scale(scale,scale);const img=p.useLogo?f.images?.get(p.logo):null;if(img){const bh=h*.16;ctx.drawImage(img,-bh*img.width/img.height/2,-bh/2,bh*img.width/img.height,bh);}else text(ctx,f,p.text,0,0,h*.085,p.color);
});

export const { id, label, help, params, defaults, defaultDuration, draw } = template;
export default template;
