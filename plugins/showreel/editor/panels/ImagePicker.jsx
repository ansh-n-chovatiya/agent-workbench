import { h } from 'preact';
import { useRef, useState } from 'preact/hooks';
import { ImagePlus, LoaderCircle, Replace, Trash2 } from 'lucide-preact';
import { Button } from '../ui/button.jsx';
import { upload } from '../state.js';

// Mirrors scripts/lib/editor/upload-api.mjs (a unit test keeps them equal).
export const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'svg'];
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const assetUrl = file => `/media/asset/${String(file).split('/').map(encodeURIComponent).join('/')}`;
const baseName = file => String(file ?? '').split('/').pop();

// Choose or drop an image: it is uploaded into the project and shown as a thumbnail with Replace and Remove. Never a path text box.
export function ImagePicker({ id, label, value, onChange, disabled = false }) {
  const input = useRef(), [busy, setBusy] = useState(false), [error, setError] = useState(''), [over, setOver] = useState(false);
  async function choose(file) {
    if (!file) return;
    setError('');
    const ext = file.name.split('.').pop().toLowerCase();
    if (!IMAGE_EXTENSIONS.includes(ext)) { setError('Choose a PNG, JPG, WebP or SVG image.'); return; }
    if (file.size > MAX_IMAGE_BYTES) { setError('That image is larger than 10 MB.'); return; }
    setBusy(true);
    try { const { file: stored } = await upload(`/api/upload/image?name=${encodeURIComponent(file.name)}`, file, file.type || 'application/octet-stream'); onChange(stored); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  return <div class="img-pick" id={id} role="group" aria-label={label}>
    {value ? <div class="img-current">
      <img class="img-thumb" src={assetUrl(value)} alt="" />
      <div class="img-meta"><strong title={value}>{baseName(value)}</strong><span>{value.includes('/') ? value.slice(0, value.lastIndexOf('/')) : 'project folder'}</span></div>
      <div class="img-actions">
        <Button size="sm" variant="outline" disabled={busy || disabled} aria-label={`Replace ${label}`} onClick={() => input.current.click()}>{busy ? <LoaderCircle class="spin" size={13} aria-hidden="true" /> : <Replace size={13} aria-hidden="true" />}Replace</Button>
        <Button size="sm" disabled={busy || disabled} aria-label={`Remove ${label}`} onClick={() => onChange(null)}><Trash2 size={13} aria-hidden="true" />Remove</Button>
      </div>
    </div> : <button type="button" class={`img-drop ${over ? 'over' : ''}`} disabled={busy || disabled} aria-label={`Choose ${label}`} onClick={() => input.current.click()}
      onDragOver={e => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={e => { e.preventDefault(); setOver(false); choose(e.dataTransfer?.files?.[0]); }}>
      {busy ? <LoaderCircle class="spin" size={18} aria-hidden="true" /> : <ImagePlus size={18} aria-hidden="true" />}
      <strong>{busy ? 'Uploading…' : 'Choose image'}</strong><span>or drop one here · PNG, JPG, WebP or SVG up to 10 MB</span>
    </button>}
    <input ref={input} class="sr-only" type="file" tabIndex="-1" aria-label={`Choose ${label} file`} accept=".png,.jpg,.jpeg,.webp,.svg,image/png,image/jpeg,image/webp,image/svg+xml"
      onChange={e => { const file = e.currentTarget.files?.[0]; e.currentTarget.value = ''; choose(file); }} />
    {!!error && <p class="error" role="alert">{error}</p>}
  </div>;
}
