import { define, string, number, enumeration, color, boolean, POSITIONS, anchor, text, panel, paint, box, sourceRect, motion } from './shared.mjs';
import { EASING } from '../easing.mjs';
const template = define('outro-card', 'Outro card', 'Full canvas closing message.', { title:string('Thank you',80), subtitle:string('Discover more',140) }, (ctx, f, p, s) => {
  const h = f.height;
  const a=anchor(f,p); panel(ctx,f,0,0,f.width,f.height); ctx.fillStyle=paint(f,p.color); ctx.fillRect(f.width*.42,h*.3,f.width*.16,h*.009); text(ctx,f,p.title,a.x,a.y,h*.075); text(ctx,f,p.subtitle,a.x,a.y+h*.11,h*.032,'muted');
});

export const { id, label, help, params, defaults, defaultDuration, draw } = template;
export default template;
