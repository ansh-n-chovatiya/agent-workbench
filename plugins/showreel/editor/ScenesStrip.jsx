import { h } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { sceneRows,patchScene,reorderScenes,saveScenes,canActivateScene,TRANSITIONS } from './scenes-api.js';
import { request } from './state.js';
import { Button } from './ui/button.jsx';
import { Input } from './ui/input.jsx';
import { Select } from './ui/select.jsx';
import { Slider } from './ui/slider.jsx';
import { Popover } from './ui/popover.jsx';
function TransitionControl({scene,index,transition,busy,onSave}) {
  const [duration,setDuration]=useState(scene.transition?.durationSec??.5);
  useEffect(()=>setDuration(scene.transition?.durationSec??.5),[scene.transition?.durationSec]);
  return <Popover label={`Transition after scene ${index+1}`} trigger={<Button aria-label={`Transition after scene ${index+1}`}>{transition==='cut'?'│':transition==='crossfade'?'◐':transition==='slide'?'⇢':'⊕'}</Button>}>
    <label>Transition<Select aria-label={`Scene ${index+1} transition`} value={transition} disabled={busy} options={TRANSITIONS} onValueChange={type=>onSave({transition:{...scene.transition,type,...(type!=='cut'?{durationSec:duration}:{})}})}/></label>
    {transition!=='cut'&&<label>Duration {duration.toFixed(1)} s<Slider aria-label={`Scene ${index+1} transition duration`} min={.2} max={1.5} step={.1} value={[duration]} disabled={busy} onValueChange={([value])=>setDuration(value)} onValueCommit={([durationSec])=>onSave({transition:{...scene.transition,durationSec}})}/></label>}
  </Popover>;
}
export function ScenesStrip({state,store}) {
  const [drag,setDrag]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const document=state.project?.scenes,rows=sceneRows(document,state.project,state.plan);
  if(!document||!rows.length)return null;
  async function save(next){if(busy)return;setBusy(true);try{await store.save();await saveScenes(request,next);store.setProject({scenes:next});setError('');}catch(e){setError(e.message);}finally{setBusy(false);}}
  return <div class="scenes-area"><div class="scenes-strip" role="region" aria-label="Scenes"><strong>Scenes</strong>{rows.map(({scene,index,title,duration,transition})=><div class="scene-unit" key={scene.id??index}>
    <div class="scene-chip" draggable={!busy} onDragStart={e=>{setDrag(index);e.dataTransfer?.setData('text/plain',String(index));}} onDragEnd={()=>setDrag(null)} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();if(drag!==null&&drag!==index)save(reorderScenes(document,drag,index));setDrag(null);}}>
      <Input key={`${scene.id}-${scene.title}`} aria-label={`Scene ${index+1} title`} defaultValue={title} maxLength="60" disabled={busy} onBlur={e=>{if(e.currentTarget.value!==title)save(patchScene(document,index,{title:e.currentTarget.value}));}} onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur();}}/>
      <span class="setting-help">{Number.isFinite(duration)?`${duration.toFixed(1)} s`:'Duration pending'}</span>
      {canActivateScene(state.plan,store)&&<Button onClick={()=>store.activateScene(scene.id)}>Edit scene</Button>}
      <Button size="sm" aria-label={`Move scene ${index+1} earlier`} disabled={busy||index===0} onClick={()=>save(reorderScenes(document,index,index-1))}>←</Button><Button size="sm" aria-label={`Move scene ${index+1} later`} disabled={busy||index===rows.length-1} onClick={()=>save(reorderScenes(document,index,index+1))}>→</Button>
    </div>
    {index<rows.length-1&&<TransitionControl scene={scene} index={index} transition={transition} busy={busy} onSave={patch=>save(patchScene(document,index,patch))}/>}
  </div>)}</div>{error&&<p class="error" role="alert">{error}</p>}</div>;
}
