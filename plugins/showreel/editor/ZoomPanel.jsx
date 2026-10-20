import { h } from 'preact';
import { useState } from 'preact/hooks';
import { regionAtTime } from './zoom-screen.mjs';
import { DEPTH_PRESETS, setZoomMode } from './zoom-box.mjs';
import { deleteZoomRegion } from './edit-ops.mjs';
import { Button } from './ui/button.jsx';
import { Badge } from './ui/badge.jsx';
import { ToggleGroup } from './ui/toggle-group.jsx';
import { PanelShell } from './panels/PanelShell.jsx';
import { SettingsCard } from './panels/SettingsCard.jsx';
import { Row, ResetButton } from './panels/Rows.jsx';
import { Focus, ZoomIn, Move } from './panels/icons.js';
export function DepthChips({depth,onChange}) {
  return <div class="depth-chips" role="group" aria-label="Zoom depth">{DEPTH_PRESETS.map(d=><Button key={d} size="sm" aria-label={`Depth ${d}x`} aria-pressed={Math.abs(depth-d)<.001} onClick={()=>onChange(d)}>{d}x</Button>)}</div>;
}
export function ZoomPanel({state,store,region,time,onClose}) {
  const [error,setError] = useState('');
  const c = {...state.composition,zoom:{...state.composition.zoom,autoSuggest:false,regions:state.plan?.regions ?? state.composition.zoom.regions}};
  const context = {duration:state.project.record.durationSec,events:state.project.events,record:state.project.record,plan:state.plan,time,t:time,sourceT:time,viewport:state.project.events.viewport,focus:regionAtTime(region,time).keyframes[0]};
  const mode = region.source === 'manual' ? 'manual' : 'auto';
  const speed = state.composition.zoom.speed ?? 'normal';
  function act(fn) {try {store.setComposition(fn());setError('');}catch(e){setError(e.message);}}
  return <PanelShell ariaLabel="Zoom settings" title="Zoom" subtitle={`${region.tStart.toFixed(2)}–${region.tEnd.toFixed(2)} s on the recording`} onClose={onClose}
    badge={<Badge>{region.depth}x{!DEPTH_PRESETS.includes(region.depth) ? ' · Custom' : ''}</Badge>} footer="Drag the box on the preview to aim the camera"
    actions={<Button class="delete-action" variant="outline" onClick={()=>act(()=>{const next=deleteZoomRegion(c,region.id,context);onClose();return next;})}>Delete Zoom</Button>}>
    <SettingsCard id="zoom-focus" title="Focus" icon={Focus} description={mode==='auto' ? 'The camera follows the clicked element' : 'A fixed point you choose on the preview'}>
      <Row stacked id="zoom-mode" label="Mode" tip="Auto aims at what was clicked; Manual keeps the focus where you put the box.">
        <ToggleGroup id="zoom-mode" aria-label="Zoom mode" value={mode} options={[{value:'auto',label:'Auto'},{value:'manual',label:'Manual'}]} onValueChange={value=>act(()=>setZoomMode(c,region.id,value,context))}/>
      </Row>
      {mode==='manual' && <p class="manual-hint">Drag the box on the preview, or its corners to change the depth.</p>}
    </SettingsCard>
    <SettingsCard id="zoom-depth" title="Depth" icon={ZoomIn} description="How much closer the page appears">
      <DepthChips depth={region.depth} onChange={depth=>act(()=>({...c,zoom:{...c.zoom,regions:c.zoom.regions.map(z=>z.id===region.id ? {...z,depth} : z)}}))}/>
    </SettingsCard>
    <SettingsCard id="zoom-camera" title="Camera" icon={Move}>
      <Row id="zoom-sel-speed" label="Camera speed" tip="How quickly the view glides between zoomed areas. Applies to every zoom." reset={<ResetButton label="Camera speed" visible={speed!=='normal'} onClick={()=>store.change('zoom.speed',undefined,{reset:true})}/>}>
        <ToggleGroup id="zoom-sel-speed" aria-label="Smooth camera" value={speed} options={['slow','normal','fast'].map(value=>({value,label:value[0].toUpperCase()+value.slice(1)}))} onValueChange={value=>store.change('zoom.speed',value)}/>
      </Row>
    </SettingsCard>
    {error && <p class="error" role="alert">{error}</p>}
  </PanelShell>;
}
