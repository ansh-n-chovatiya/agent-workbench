import { safeImagePath } from '../compose/composition.mjs';
export const BRAND_NAME = /^[a-z0-9][a-z0-9-]{0,40}$/;
export const IMAGE_EXT = /\.(png|svg|webp|jpg)$/i;
export const FONT_EXT = /\.(woff2|ttf|otf)$/i;
export const IMAGE_LIMIT = 10 * 1024 * 1024;
export const FONT_LIMIT = 2 * 1024 * 1024;
export function brandDefaults(name) {
  return { version: 1, name, logo: null, colors: { primary: '#0f766e', accent: '#0f766e', background: '#eef2f7', text: '#111827', muted: '#4b5563' },
    fonts: { heading: null, body: null }, intro: { enabled: true, title: null, subtitle: null, durationSec: 2.2, align: 'center' },
    outro: { enabled: true, text: 'Thank you', durationSec: 2 }, watermark: { enabled: false, file: null, position: 'top-right', opacity: 0.25, sizePct: 10, marginPct: 3 }, defaultTheme: 'clean' };
}
const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
export function validateBrand(b) {
  const errors = [], fail = (p,m) => errors.push(`brand.json: "${p}" ${m}`);
  function keys(v, allowed, p, optional = []) {
    if (!object(v)) { fail(p,'must be an object'); return false; }
    for (const k of Object.keys(v)) if (!allowed.includes(k)) fail(p ? `${p}.${k}` : k,'is unknown');
    for (const k of allowed) if (!optional.includes(k) && !Object.hasOwn(v,k)) fail(p ? `${p}.${k}` : k,'is required');
    return true;
  }
  const range = (v,p,a,z) => { if (!Number.isFinite(v) || v<a || v>z) fail(p,`must be from ${a} to ${z}`); };
  const text = (v,p,max,nullable=false) => { if (!(nullable && v === null) && (typeof v !== 'string' || !v.trim() || v.length>max)) fail(p,`must be text of 1 to ${max} characters${nullable ? ' or null' : ''}`); };
  const file = (v,p,re) => { if (!safeImagePath(v) || !re.test(v)) fail(p,'must be a safe local asset path with an allowed extension'); };
  if (!keys(b,['version','name','logo','colors','fonts','intro','outro','watermark','defaultTheme','fontLicenceNote'],'',['fontLicenceNote'])) return {ok:false,errors};
  if (b.version !== 1) fail('version','must be 1');
  if (typeof b.name !== 'string' || !BRAND_NAME.test(b.name)) fail('name','must match [a-z0-9][a-z0-9-]{0,40}');
  if (!['clean','dark','bold'].includes(b.defaultTheme)) fail('defaultTheme','must be clean|dark|bold');
  if (b.fontLicenceNote !== undefined) text(b.fontLicenceNote,'fontLicenceNote',2000);
  if (b.logo !== null && keys(b.logo,['file','heightPct'],'logo')) { file(b.logo.file,'logo.file',IMAGE_EXT); range(b.logo.heightPct,'logo.heightPct',1,40); }
  if (keys(b.colors,['primary','accent','background','text','muted'],'colors')) for (const [k,v] of Object.entries(b.colors)) if (typeof v !== 'string' || !/^#(?:[\da-f]{3}|[\da-f]{6}|[\da-f]{8})$/i.test(v)) fail(`colors.${k}`,'must be a hex colour');
  if (keys(b.fonts,['heading','body'],'fonts')) for (const k of ['heading','body']) {
    const f=b.fonts[k], p=`fonts.${k}`;
    if (f !== null && keys(f,['file','family','weight'],p)) {
      file(f.file,`${p}.file`,FONT_EXT);
      if (typeof f.family !== 'string' || !/^[\w \-]{1,40}$/.test(f.family)) fail(`${p}.family`,'must match /^[\\w \\-]{1,40}$/');
      range(f.weight,`${p}.weight`,100,900);
    }
  }
  if (keys(b.intro,['enabled','title','subtitle','durationSec','align'],'intro')) {
    text(b.intro.title,'intro.title',200,true); text(b.intro.subtitle,'intro.subtitle',200,true);
    range(b.intro.durationSec,'intro.durationSec',0,30);
    if (!['center','left'].includes(b.intro.align)) fail('intro.align','must be center|left');
  }
  if (keys(b.outro,['enabled','text','durationSec'],'outro')) { text(b.outro.text,'outro.text',200,true); range(b.outro.durationSec,'outro.durationSec',0,30); }
  if (keys(b.watermark,['enabled','file','position','opacity','sizePct','marginPct'],'watermark',['file'])) {
    const w=b.watermark;
    if (w.file != null) file(w.file,'watermark.file',IMAGE_EXT);
    if (w.enabled && !w.file && !b.logo?.file) fail('watermark.file','requires an image or logo when enabled');
    if (!['top-left','top-right','bottom-left','bottom-right'].includes(w.position)) fail('watermark.position','is invalid');
    range(w.opacity,'watermark.opacity',0.05,1); range(w.sizePct,'watermark.sizePct',3,30); range(w.marginPct,'watermark.marginPct',0,25);
  }
  for (const k of ['intro','outro','watermark']) if (typeof b[k]?.enabled !== 'boolean') fail(`${k}.enabled`,'must be boolean');
  return {ok:!errors.length,errors};
}
