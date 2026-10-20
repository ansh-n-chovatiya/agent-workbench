import { h } from 'preact';
import { useState } from 'preact/hooks';
import { setClipSpeed, deleteClip, restoreClip, setClipMuted } from './clips.mjs';
import { Button } from './ui/button.jsx';
import { Badge } from './ui/badge.jsx';
import { Switch } from './ui/switch.jsx';
import { PanelShell } from './panels/PanelShell.jsx';
import { SettingsCard } from './panels/SettingsCard.jsx';
import { Row } from './panels/Rows.jsx';
import { Gauge, Volume2 } from './panels/icons.js';
export const CLIP_SPEEDS = [.25,.5,.75,1,1.25,1.5,2,2.5,3,4,5,8,10,15,20,30];
export function ClipPanel({state,store,clip,onClose}) {
  const [error,setError] = useState('');
  function act(fn){try{store.setComposition(fn(state.composition,clip,{duration:state.project.record.durationSec}));setError('');}catch(e){setError(e.message);}}
  return <PanelShell ariaLabel="Clip settings" title="Clip" subtitle={`${clip.start.toFixed(2)}–${clip.end.toFixed(2)} s · ${(clip.end-clip.start).toFixed(2)} s long`} onClose={onClose}
    badge={<Badge>{clip.deleted ? 'Removed' : `${clip.rate}x`}</Badge>} footer="Press S on the timeline to split at the playhead"
    actions={<Button variant="outline" class={clip.deleted ? '' : 'delete-action'} onClick={()=>act(clip.deleted ? restoreClip : deleteClip)}>{clip.deleted ? 'Restore Clip' : 'Delete Clip'}</Button>}>
    <SettingsCard id="clip-speed" title="Speed" icon={Gauge} description={clip.rate===1 ? 'Plays at the recorded pace' : clip.rate>1 ? `Fast-forwards ${clip.rate}x` : `Slows to ${clip.rate}x`}>
      <div class="speed-grid" role="group" aria-label="Clip speed">{CLIP_SPEEDS.map(rate=><Button key={rate} size="sm" disabled={clip.deleted} aria-pressed={clip.rate===rate} onClick={()=>act(c=>setClipSpeed(c,clip,rate,{duration:state.project.record.durationSec}))}>{rate}x</Button>)}</div>
    </SettingsCard>
    <SettingsCard id="clip-audio" title="Audio" icon={Volume2}>
      <Row id="clip-mute" label="Mute" tip="Silences narration and music while this clip plays." hint={clip.muted ? 'Audio is muted for this clip' : 'Audio plays normally'}>
        <Switch id="clip-mute" aria-label="Mute clip" disabled={clip.deleted} checked={clip.muted} onCheckedChange={value=>act(c=>setClipMuted(c,clip,value,{duration:state.project.record.durationSec}))}/>
      </Row>
    </SettingsCard>
    {error && <p class="error" role="alert">{error}</p>}
  </PanelShell>;
}
