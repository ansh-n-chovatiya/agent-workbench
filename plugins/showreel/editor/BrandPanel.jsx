import { h } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { Check, Copy } from 'lucide-preact';
import { request } from './state.js';
import { changeComposition } from '../scripts/lib/compose/composition.mjs';
import { applyBrandToComposition } from '../scripts/lib/brand/apply.mjs';
import { brandOverrides, resetBrandWatermark } from './brand-model.mjs';
import { Button } from './ui/button.jsx';
import { Select } from './ui/select.jsx';
import { Switch } from './ui/switch.jsx';
import { Slider } from './ui/slider.jsx';
import { Badge } from './ui/badge.jsx';
import { SettingsCard } from './panels/SettingsCard.jsx';
import { Row, NumberPill } from './panels/Rows.jsx';
import { EmptyState } from './panels/EmptyState.jsx';
import { BadgeCheck, Droplet, LoaderCircle } from './panels/icons.js';
const command='showreel brand init --brand NAME';
const POSITIONS=[{value:'top-left',label:'Top left'},{value:'top-right',label:'Top right'},{value:'bottom-left',label:'Bottom left'},{value:'bottom-right',label:'Bottom right'}];
function CommandRow({onError}) {
  const [copied,setCopied]=useState(false);
  return <div class="command-row"><code>{command}</code><Button size="sm" variant="outline" aria-label="Copy brand command" onClick={async()=>{try{await navigator.clipboard.writeText(command);setCopied(true);setTimeout(()=>setCopied(false),1800);}catch{onError('Copy the command shown here.');}}}>{copied?<Check size={13} aria-hidden="true"/>:<Copy size={13} aria-hidden="true"/>}{copied?'Copied':'Copy'}</Button></div>;
}
export function BrandPanel({state,store}) {
  const [brands,setBrands]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  useEffect(()=>{let active=true;request('/api/brands').then(v=>{if(active)setBrands(v.brands??[]);}).catch(e=>{if(active){setBrands([]);setError(e.message);}});return()=>{active=false;};},[]);
  const brand=state.project.brand, name=state.project.brief?.brand, values=applyBrandToComposition(state.composition,brand).watermark;
  const overrides=brandOverrides(state.composition);
  async function apply(value){setBusy(true);try{await store.save();const result=await request('/api/brand/apply',{method:'POST',body:JSON.stringify({brand:value==='none'?null:value})});store.setProject({brief:result.brief,brand:result.brand});setError('');}catch(e){setError(e.message);}finally{setBusy(false);}}
  const setWatermark=(key,value)=>{try{
    if(key==='enabled'&&value&&!values.image)throw new Error('Apply a brand with a logo before showing a watermark.');
    if(key==='enabled'&&value)store.setComposition(changeComposition(changeComposition(state.composition,'watermark.image',values.image),'watermark.enabled',true),'watermark.enabled');
    else store.change(`watermark.${key}`,value);
    setError('');
  }catch(e){setError(e.message);}};
  const options=[{value:'none',label:'No brand'},...(brands??[]).map(b=>({value:b.name,label:b.name})),...(name&&!(brands??[]).some(b=>b.name===name)?[{value:name,label:name}]:[])];
  return <div class="brand-panel">
    <SettingsCard id="brand" title="Brand" icon={BadgeCheck} description="A saved logo, colours, fonts and watermark" badge={busy?<LoaderCircle class="spin" size={14} aria-hidden="true"/>:null}>
      <Row stacked id="applied-brand" label="Applied brand" tip="Brand kits live in your Showreel home folder and apply to the whole project.">
        <Select id="applied-brand" aria-label="Applied brand" disabled={busy||brands===null} value={name??'none'} onValueChange={apply} options={options}/>
      </Row>
      {brand ? <section class="brand-summary" aria-label="Brand summary">
        {brand.logo?.file&&<img alt={`${brand.name} logo`} src={`/media/brand/${encodeURIComponent(brand.name)}/${brand.logo.file.split('/').map(encodeURIComponent).join('/')}`}/>}
        <div class="brand-swatches">{Object.entries(brand.colors??{}).map(([key,color])=><span key={key} title={`${key}: ${color}`}><i class="brand-swatch" style={{background:color}}/>{key}</span>)}</div>
        <p class="brand-fonts">{Object.entries(brand.fonts??{}).map(([role,font])=>`${role}: ${font?.family??'Theme font'}`).join(' · ')}</p>
      </section>
      : brands===null ? <EmptyState compact icon={LoaderCircle} spin title="Loading brands…"/>
      : <EmptyState compact icon={BadgeCheck} title={brands.length ? 'No brand applied' : 'No brands yet'} line={brands.length ? 'Pick one above to use its logo, colours and watermark.' : 'Create a brand kit in a terminal, then pick it here.'}/>}
      <div class="command-block"><p class="command-hint">Create or edit brands with</p><CommandRow onError={setError}/></div>
    </SettingsCard>
    <SettingsCard id="watermark" title="Watermark" icon={Droplet} description={brand ? `${brand.watermark?.enabled?'On':'Off'} in the brand · ${brand.watermark?.position?.replace('-',' ')}` : 'Needs a brand with a logo'}
      actions={brand&&overrides.length>0 ? <Button size="sm" variant="outline" onClick={()=>store.setComposition(resetBrandWatermark(state.composition))}>Reset to brand</Button> : null}
      badge={brand&&overrides.length>0 ? <Badge>Overrides the brand</Badge> : null}>
      <Row id="setting-watermark.enabled" label="Show watermark" tip="Place the brand logo in a corner of the video."><Switch id="setting-watermark.enabled" aria-label="Show watermark" checked={!!values.enabled} onCheckedChange={v=>setWatermark('enabled',v)}/></Row>
      <Row id="setting-watermark.position" label="Position" tip="Which corner holds the watermark."><Select id="setting-watermark.position" aria-label="Watermark position" value={values.position} options={POSITIONS} onValueChange={v=>setWatermark('position',v)}/></Row>
      <Row slider id="setting-watermark.opacity" label="Opacity" tip="How see-through the watermark is." pill={<NumberPill aria-label="Watermark opacity value" value={values.opacity} min={.05} max={1} step={.05} onChange={v=>v!==null&&setWatermark('opacity',v)}/>}>
        <Slider id="setting-watermark.opacity" aria-label="Watermark opacity" min={.05} max={1} step={.05} value={[values.opacity??.25]} onValueChange={([v])=>setWatermark('opacity',v)}/></Row>
      <Row slider id="setting-watermark.sizePct" label="Size" tip="The watermark's width as a share of the video width." pill={<NumberPill aria-label="Watermark size value" value={values.sizePct} min={3} max={30} step={1} unit="%" onChange={v=>v!==null&&setWatermark('sizePct',v)}/>}>
        <Slider id="setting-watermark.sizePct" aria-label="Watermark size" min={3} max={30} step={1} value={[values.sizePct??10]} onValueChange={([v])=>setWatermark('sizePct',v)}/></Row>
    </SettingsCard>
    {error&&<p class="error" role="alert">{error}</p>}
  </div>;
}
