import { define, string, number, enumeration, color, boolean, POSITIONS, anchor, text, panel, paint, box, sourceRect, motion, measurePlate, fitPlate, drawPlate, plateText, calloutGeometry } from './shared.mjs';
import { EASING } from '../easing.mjs';
const template = define('lower-third', 'Lower third', 'Name and subtitle on a compact plate.', { position:{type:'position',values:POSITIONS,default:'bottom-left'}, name:string('Alex Morgan',70), subtitle:string('Product designer',100) }, (ctx, f, p, s) => {
  const lines=[{text:p.name,size:f.height*.028},{text:p.subtitle,size:f.height*.020}];
  const size=measurePlate(ctx,f,lines,{minWidth:f.height*.12}), r=fitPlate(f,p,size);
  drawPlate(ctx,f,r,size,p.color);
  let y=r.y+size.py;
  for(const l of lines){plateText(ctx,f,l.text,r.x+size.px,y+l.size*.625,l.size,r.w-2*size.px);y+=l.size*1.25;}

});

export const { id, label, help, params, defaults, defaultDuration, draw } = template;
export default template;
