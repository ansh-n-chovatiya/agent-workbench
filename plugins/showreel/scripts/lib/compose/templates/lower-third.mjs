import { define, string, number, enumeration, color, boolean, POSITIONS, anchor, text, panel, paint, box, sourceRect, motion } from './shared.mjs';
import { EASING } from '../easing.mjs';
const template = define('lower-third', 'Lower third', 'Name and subtitle on a compact plate.', { position:{type:'position',values:POSITIONS,default:'bottom-left'}, name:string('Alex Morgan',70), subtitle:string('Product designer',100) }, (ctx, f, p, s) => {
  const h = f.height;
  const a=anchor(f,p),w=f.width*.36; panel(ctx,f,a.x-w*.2,a.y-h*.05,w,h*.13); ctx.fillStyle=paint(f,p.color); ctx.fillRect(a.x-w*.2,a.y-h*.05,h*.006,h*.13); text(ctx,f,p.name,a.x-w*.15,a.y,h*.032,'onSurface','left'); text(ctx,f,p.subtitle,a.x-w*.15,a.y+h*.045,h*.022,'muted','left');
});

export const { id, label, help, params, defaults, defaultDuration, draw } = template;
export default template;
