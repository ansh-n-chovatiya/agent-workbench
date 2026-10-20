export function brandOverrides(c) {
  return Object.keys(c.watermark??{}).filter(k=>!Object.hasOwn(c.brandDefaults??{},`watermark.${k}`)||JSON.stringify(c.watermark[k])!==JSON.stringify(c.brandDefaults[`watermark.${k}`]));
}
export function resetBrandWatermark(c) {
  const next=structuredClone(c);delete next.watermark;
  for(const k of Object.keys(next.brandDefaults??{}))if(k.startsWith('watermark.'))delete next.brandDefaults[k];
  return next;
}
