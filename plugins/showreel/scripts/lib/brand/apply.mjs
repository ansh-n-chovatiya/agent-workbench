import { resolveComposition } from '../compose/composition.mjs';
import { THEMES } from '../compose/themes.mjs';
export const brandImage = (brand,file) => file ? `brand/${brand.name}/${file}` : null;
const clone = v => structuredClone(v);
export function leafValues(value, prefix = '', out = {}) {
  for (const [k,v] of Object.entries(value)) {
    const p=prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) leafValues(v,p,out); else out[p]=clone(v);
  }
  return out;
}
const get=(v,p)=>p.split('.').reduce((n,k)=>n?.[k],v);
function put(v,p,x) {
  const keys=p.split('.');
  if (keys.some(k=>['__proto__','prototype','constructor'].includes(k))) throw new Error('Invalid composition path');
  let n=v;
  for (const k of keys.slice(0,-1)) n=n[k] ??= {};
  n[keys.at(-1)]=clone(x);
}
// Precedence: explicit composition value > brand value > theme default.
// New generated compositions retain a snapshot of generated defaults; unchanged leaves
// can inherit a brand. Legacy compositions have no snapshot: their saved leaves are explicit.
export function applyBrandToComposition(composition, brand) {
  if (!brand) return resolveComposition(composition);
  const patch=clone(composition), generated=patch.brandDefaults ?? {};
  for (const [p,v] of Object.entries(generated)) {
    const brandText = { 'cards.title.title': brand.intro.title, 'cards.title.subtitle': brand.intro.subtitle, 'cards.outro.text': brand.outro.text };
    if (Object.hasOwn(brandText,p) && brandText[p] === null) continue;
    if (JSON.stringify(get(patch,p)) !== JSON.stringify(v)) continue;
    const keys=p.split('.'); const last=keys.pop(); const parent=keys.reduce((n,k)=>n?.[k],patch);
    if (parent) delete parent[last];
  }
  delete patch.brandDefaults;
  const source=composition.themeSource ?? (composition.theme ? 'user' : 'default');
  const themeName=source === 'user' ? composition.theme : brand.defaultTheme;
  const c=brand.colors;
  const defaults={theme:themeName,themeSource:source === 'user' ? 'user' : 'brand',
    frame:{background:{type:'solid',colors:[c.background]}},cursor:{fill:c.accent,clickEffect:{color:c.accent}},
    captions:brand.fonts.body ? {fontWeight:brand.fonts.body.weight} : {},
    cards:{},watermark:{...brand.watermark,image:brandImage(brand,brand.watermark.file ?? brand.logo?.file)}};
  delete defaults.watermark.file;
  for (const k of ['title','outro']) defaults.cards[k]={ titleColor:c.text,subtitleColor:c.muted,background:{type:'solid',colors:[c.background]},accent:{color:c.primary},
    ...(brand.logo ? {logo:{image:brandImage(brand,brand.logo.file),heightPct:brand.logo.heightPct}} : {}) };
  Object.assign(defaults.cards.title,Object.fromEntries(Object.entries(brand.intro).filter(([,v])=>v !== null)));
  Object.assign(defaults.cards.outro,Object.fromEntries(Object.entries(brand.outro).filter(([,v])=>v !== null)));
  if (source !== 'user') { delete patch.theme; delete patch.themeSource; }
  // Merge leaves so explicit nulls (including logo) disable inheritance.
  for (const [p,v] of Object.entries(leafValues(patch))) put(defaults,p,v);
  // logo:null and background containers removed from a generated snapshot leave empty objects.
  return resolveComposition(defaults);
}
export const brandUrl = (brand,file,base='brand/') => file ? `${base}${encodeURIComponent(brand.name)}/${file.split('/').map(encodeURIComponent).join('/')}` : null;
export function planBrand(brand, composition, base='brand/') {
  if (!brand) return null;
  return {name:brand.name,fonts:Object.values(brand.fonts).filter(Boolean).map(f=>({family:f.family,weight:f.weight,url:brandUrl(brand,f.file,base)})),
    heading:brand.fonts.heading,body:brand.fonts.body,
    logoUrl:brandUrl(brand,brand.logo?.file,base),
    assetUrls:Object.fromEntries([brand.logo?.file,brand.watermark.file ?? brand.logo?.file].filter(Boolean).map(file=>[brandImage(brand,file),brandUrl(brand,file,base)])),
    watermark:{...composition.watermark,url:composition.watermark.image === brandImage(brand,brand.watermark.file ?? brand.logo?.file) ? brandUrl(brand,brand.watermark.file ?? brand.logo?.file,base) : null}};
}
export function brandTheme(brand, themeName) {
  const theme=clone(THEMES[themeName]);
  if (!brand) return theme;
  theme.typography.bodyFamily = theme.typography.family;
  const c=brand.colors;
  theme.background.colors=[c.background,c.background];
  theme.card.background.colors=[c.background,c.background];
  Object.assign(theme.card,{titleColor:c.text,subtitleColor:c.muted,accent:c.primary});
  theme.ripple.color=c.accent;
  if (brand.fonts.heading) {
    theme.typography.family=brand.fonts.heading.family;
    theme.typography.weights.display=brand.fonts.heading.weight;
  }
  return theme;
}
