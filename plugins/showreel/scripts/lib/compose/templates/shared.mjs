import { EASING } from '../easing.mjs';
export const POSITIONS = ['top-left','top-center','top-right','center-left','center','center-right','bottom-left','bottom-center','bottom-right'];
export const string = (value, maxLength = 140) => ({ type: 'string', maxLength, default: value });
export const number = (value, min = 0, max = 100) => ({ type: 'number', min, max, default: value });
export const enumeration = (value, values) => ({ type: 'enum', values, default: value });
export const color = (value = 'accent') => ({ type: 'color', default: value });
export const boolean = value => ({ type: 'boolean', default: value });
export function define(id, label, help, params, draw, defaultDuration = 3) {
  params = { position: { type: 'position', values: POSITIONS, default: 'center' }, offsetX: number(0, -100, 100), offsetY: number(0, -100, 100), color: color(), ...params };
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
export function anchor(f, p) {
  const pos = f.anchor ?? p.position, x = pos.endsWith('left') ? 0.12 : pos.endsWith('right') ? 0.88 : 0.5;
  const y = pos.startsWith('top') ? 0.14 : pos.startsWith('bottom') ? 0.82 : 0.5;
  return { x: f.width * (x + p.offsetX / 100), y: f.height * (y + p.offsetY / 100) };
}
export function text(ctx, f, value, x, y, size, c = 'onSurface', align = 'center') {
  ctx.font = `${f.theme.typography.weights.display} ${size}px "${f.theme.typography.family}"`;
  ctx.fillStyle = paint(f,c); ctx.textAlign = align; ctx.textBaseline = 'middle';
  ctx.fillText(value, x, y, f.width * 0.84);
}
export function panel(ctx, f, x, y, w, h, c = 'surface') {
  ctx.fillStyle = paint(f,c); ctx.beginPath(); ctx.roundRect(x,y,w,h,f.height * 0.012); ctx.fill();
}
export function box(f, p) {
  const a = f.mapSource({x:p.x,y:p.y}), b = f.mapSource({x:p.x+p.width,y:p.y+p.height});
  return { x:a.x, y:a.y, w:b.x-a.x, h:b.y-a.y };
}
export const sourceRect = { x:number(320,0,100000), y:number(180,0,100000), width:number(320,1,100000), height:number(180,1,100000) };
export const motion = s => EASING.enterOut(Math.min(1, s.progress * 6));
