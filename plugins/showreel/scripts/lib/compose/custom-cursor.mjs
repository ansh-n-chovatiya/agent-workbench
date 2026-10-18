// Images stay keyed by project-relative paths in plans and render options.
export const imageAssetUrl = (image) => `assets/${image.split('/').map(encodeURIComponent).join('/')}`;
export const cursorImageWarning = (image) => `Cannot load custom cursor image: ${image}; using vector arrow`;
export function customCursorSpec(cursor, shape) {
  return cursor.custom?.[shape] ?? cursor.custom?.arrow;
}
export async function loadCustomCursorImages(plan, urls, load) {
  const loaded = new Map();
  if (plan.cursor.style !== 'custom') return loaded;
  const specs = ['arrow', 'hand', 'text'].map((shape) => plan.cursor.custom?.[shape]).filter(Boolean);
  await Promise.all([...new Set(specs.map((spec) => spec.image))].map(async (image) => {
    try { loaded.set(image, await load(urls?.[image] ?? imageAssetUrl(image))); }
    catch {
      const warning = cursorImageWarning(image);
      if (!plan.warnings.includes(warning)) plan.warnings.push(warning);
    }
  }));
  return loaded;
}
