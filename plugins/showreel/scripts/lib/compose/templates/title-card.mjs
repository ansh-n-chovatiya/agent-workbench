import { define, string, number, enumeration, color, boolean, POSITIONS, anchor, text, panel, paint, box, sourceRect, motion } from './shared.mjs';
import { EASING } from '../easing.mjs';
const template = define('title-card', 'Title card', 'Full canvas opening title and subtitle.', { title:string('Your title',80), subtitle:string('A closer look',140) }, (ctx, f, p, s) => {
  const h = Math.min(f.height,f.width*1.25);
  const a=anchor(f,p); panel(ctx,f,0,0,f.width,f.height); text(ctx,f,p.title,a.x,a.y-h*.05,h*.075,p.color); text(ctx,f,p.subtitle,a.x,a.y+h*.07,h*.032,'muted');
});

export const { id, label, help, params, defaults, defaultDuration, draw } = template;
export default template;
