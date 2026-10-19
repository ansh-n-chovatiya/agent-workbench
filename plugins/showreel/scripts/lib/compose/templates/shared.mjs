import { EASING } from '../easing.mjs';
export const POSITIONS = ['top-left','top-center','top-right','center-left','center','center-right','bottom-left','bottom-center','bottom-right'];
export const string = (value, maxLength = 140) => ({ type: 'string', maxLength, default: value });
export const number = (value, min = 0, max = 100) => ({ type: 'number', min, max, default: value });
export const enumeration = (value, values) => ({ type: 'enum', values, default: value });
export const color = (value = 'accent') => ({ type: 'color', default: value });
export const boolean = value => ({ type: 'boolean', default: value });
export function define(id, label, help, params, draw, defaultDuration = 3) {
  const canvas = ['title-card','outro-card','animated-gradient','logo-sting'].includes(id);
  params = { placement: enumeration(canvas ? 'canvas' : 'frame', ['frame','canvas']), position: { type: 'position', values: POSITIONS, default: 'center' }, offsetX: number(0, -100, 100), offsetY: number(0, -100, 100), color: color(), ...params };
  return Object.freeze({ id, label, help, params, defaults: Object.fromEntries(Object.entries(params).map(([k,s]) => [k,s.default])), defaultDuration, draw });
}
export function validateParams(template, params = {}, path = 'params') {
  const errors = [];
  if (!params || typeof params !== 'object' || Array.isArray(params)) return [`${path} must be an object`];
  for (const [key, value] of Object.entries(params)) {
    const s = Object.hasOwn(template.params,key) ? template.params[key] : null, p = `${path}.${key}`;
    if (!s) { errors.push(`${p} is unknown`); continue; }
    const valid = s.type === 'string' ? typeof value === 'string' && value.trim().length > 0 && value.length <= s.maxLength
      : s.type === 'number' ? Number.isFinite(value) && value >= s.min && value <= s.max
      : s.type === 'boolean' ? typeof value === 'boolean'
      : s.type === 'color' ? typeof value === 'string' && (/^#(?:[a-f0-9]{3,4}|[a-f0-9]{6}|[a-f0-9]{8})$/i.test(value) || ['accent','surface','onSurface','muted'].includes(value))
      : s.values.includes(value);
    if (!valid) errors.push(`${p} must be ${s.type}${s.type === 'string' ? ` of 1 to ${s.maxLength} characters` : s.type === 'number' ? ` from ${s.min} to ${s.max}` : s.values ? ` (${s.values.join(', ')})` : ''}`);
  }
  return errors;
}
export const resolveParams = (template, params) => ({ ...template.defaults, ...params });
export const paint = (f, c) => f.theme.overlay[c] ?? c;
// Largest rectangular portion of the inset frame which does not intersect captions.
export function overlaySafeArea(f, placement = 'frame') {
  if (placement === 'canvas' || !f.layout?.frame) return { x:0, y:0, w:f.width, h:f.height };
  const frame = f.layout.frame, margin = frame.w * .03;
  let r = { x:frame.x+margin, y:frame.y+margin, w:Math.max(0,frame.w-2*margin), h:Math.max(0,frame.h-2*margin) };
  const c = f.layout.caption;
  if (c && c.x < r.x+r.w && c.x+c.w > r.x && c.y < r.y+r.h && c.y+c.h > r.y) {
    const right=r.x+r.w, bottom=r.y+r.h;
    const parts = [
      {x:r.x,y:r.y,w:r.w,h:Math.max(0,c.y-r.y)},
      {x:r.x,y:Math.max(r.y,c.y+c.h),w:r.w,h:Math.max(0,bottom-Math.max(r.y,c.y+c.h))},
      {x:r.x,y:r.y,w:Math.max(0,c.x-r.x),h:r.h},
      {x:Math.max(r.x,c.x+c.w),y:r.y,w:Math.max(0,right-Math.max(r.x,c.x+c.w)),h:r.h},
    ];
    r = parts.sort((a,b)=>b.w*b.h-a.w*a.h)[0];
  }
  return r;
}
const clamp = (v, lo, hi) => Math.max(lo,Math.min(hi,v));
export function anchor(f, p) {
  const r=overlaySafeArea(f,p.placement), pos=f.anchor ?? p.position;
  const x=pos.endsWith('left')?0:pos.endsWith('right')?1:.5;
  const y=pos.startsWith('top')?0:pos.startsWith('bottom')?1:.5;
  return {x:r.x+r.w*clamp(x+(p.offsetX??0)/100,0,1),y:r.y+r.h*clamp(y+(p.offsetY??0)/100,0,1)};
}
export function fitPlate(f,p,size,point=anchor(f,p)) {
  const r=overlaySafeArea(f,p.placement), w=Math.min(size.w,r.w), h=Math.min(size.h,r.h);
  const pos=f.anchor??p.position;
  return { x:clamp(point.x-(pos.endsWith('left')?0:pos.endsWith('right')?w:w/2),r.x,r.x+r.w-w),
    y:clamp(point.y-(pos.startsWith('top')?0:pos.startsWith('bottom')?h:h/2),r.y,r.y+r.h-h),w,h };
}
export const font = (f,size) => `${f.theme.typography.weights.display} ${size}px "${f.theme.typography.family}"`;
// measureText is injected so geometry can be verified without a canvas or browser.
export function plateSize(lines, measureText, { minWidth=0, extraWidth=0 }={}) {
  const em=Math.max(...lines.map(l=>l.size)), px=em*.9, py=em*.55;
  return {w:Math.max(minWidth,Math.max(...lines.map(l=>measureText(l.text,l.size).width))+2*px+extraWidth),
    h:lines.reduce((n,l)=>n+l.size*1.25,0)+2*py, px,py,em};
}
export function measurePlate(ctx,f,lines,options) {
  return plateSize(lines,(value,size)=>{ctx.font=font(f,size);return ctx.measureText(value);},options);
}
export function drawPlate(ctx,f,r,size,accent='accent',pill=false) {
  ctx.save();ctx.shadowColor='rgba(0,0,0,0.22)';ctx.shadowBlur=size.em*.45;ctx.shadowOffsetY=size.em*.15;
  ctx.fillStyle=paint(f,'surface');ctx.globalAlpha*=.96;
  ctx.beginPath();ctx.roundRect(r.x,r.y,r.w,r.h,pill?r.h/2:size.em*.5);ctx.fill();
  ctx.shadowColor='transparent';ctx.strokeStyle=paint(f,'surfaceBorder');ctx.lineWidth=1;ctx.stroke();
  ctx.restore();
  if (!pill) {ctx.fillStyle=paint(f,accent);ctx.fillRect(r.x+1,r.y+size.em*.5,Math.max(2,size.em*.12),Math.max(0,r.h-size.em));}
}
export function plateText(ctx,f,value,x,y,size,maxWidth) {
  ctx.font=font(f,size);ctx.fillStyle=paint(f,'onSurface');ctx.textAlign='left';ctx.textBaseline='middle';
  ctx.fillText(value,x,y,Math.max(1,maxWidth));
}
// Pick the side with the greatest usable room; the leader starts at the plate edge.
export function calloutGeometry(f,p,size,target) {
  if ((f.anchor??p.position)!=='auto') {
    const r=fitPlate(f,p,size);return {plate:r,start:leaderStart(r,target),target};
  }
  const safe=overlaySafeArea(f,p.placement), gap=90*f.height/1080;
  // Keep enough room to choose a clear side even for a long label in portrait.
  const w=Math.min(size.w,safe.w*.65), h=Math.min(size.h,safe.h*.4);
  const sides=[['right',safe.x+safe.w-target.x,w],['left',target.x-safe.x,w],
    ['bottom',safe.y+safe.h-target.y,h],['top',target.y-safe.y,h]];
  sides.sort((a,b)=>(b[1]-b[2])-(a[1]-a[2]));
  const side=sides[0][0];
  let x=target.x-w/2,y=target.y-h/2;
  if(side==='right')x=target.x+Math.min(gap,Math.max(8,sides[0][1]-w));
  if(side==='left')x=target.x-w-Math.min(gap,Math.max(8,sides[0][1]-w));
  if(side==='bottom')y=target.y+Math.min(gap,Math.max(8,sides[0][1]-h));
  if(side==='top')y=target.y-h-Math.min(gap,Math.max(8,sides[0][1]-h));
  const plate={x:clamp(x,safe.x,safe.x+safe.w-w),y:clamp(y,safe.y,safe.y+safe.h-h),w,h};
  return {plate,start:leaderStart(plate,target),target};
}
function leaderStart(r,t) {
  const cx=r.x+r.w/2,cy=r.y+r.h/2,dx=t.x-cx,dy=t.y-cy;
  const scale=1/Math.max(Math.abs(dx)/(r.w/2),Math.abs(dy)/(r.h/2),1);
  return {x:cx+dx*scale,y:cy+dy*scale};
}
export function text(ctx, f, value, x, y, size, c = 'onSurface', align = 'center') {
  ctx.font = font(f,size);
  ctx.fillStyle = paint(f,c); ctx.textAlign = align; ctx.textBaseline = 'middle';
  ctx.fillText(value, x, y, f.width * 0.84);
}
export function panel(ctx, f, x, y, w, h, c = 'surface') {
  ctx.fillStyle = paint(f,c); ctx.beginPath(); ctx.roundRect(x,y,w,h,f.height * 0.012); ctx.fill();
}
export function box(f, p) {
  const pad=p.pad??6, x=p.x-(p.origin==='center'?p.width/2:0), y=p.y-(p.origin==='center'?p.height/2:0);
  const a = f.mapSource({x:x-pad,y:y-pad}), b = f.mapSource({x:x+p.width+pad,y:y+p.height+pad});
  return { x:a.x, y:a.y, w:b.x-a.x, h:b.y-a.y };
}
export const sourceRect = { origin:enumeration('topleft',['topleft','center']), pad:number(6,0,200), x:number(320,0,100000), y:number(180,0,100000), width:number(320,1,100000), height:number(180,1,100000) };
export const motion = s => EASING.enterOut(Math.min(1, s.progress * 6));
