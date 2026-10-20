import { h } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { drawFrame, loadAssets, loadFonts } from '../scripts/lib/compose/draw.js';
import { planRender, stateAt } from '../scripts/lib/compose/plan.mjs';
import { themePreviewGeometry } from './theme-preview.mjs';
import { editorAudioUrls } from './state.js';
import { Button } from './ui/button.jsx';
function ThemeCard({id,state,store,time,provider}) {
  const canvas=useRef(),[error,setError]=useState('');
  useEffect(()=>{
    let active=true;
    if(!state.plan)return;
    (async()=>{
      const composition={...state.composition,theme:id,themeSource:'user'};
      const plan=planRender({...state.project,scenes:undefined,composition,sourceSize:state.plan.sourceSize,voiceClips:state.project.clips,audioUrls:editorAudioUrls,brandBase:'/media/brand/'});
      const t=Math.min(time??0,plan.timemap.outputDuration), frameState=stateAt(plan,t);
      await loadFonts({regular:'/fonts/Inter-Regular.woff2',semibold:'/fonts/Inter-SemiBold.woff2'});
      const [assets,frame]=await Promise.all([loadAssets(plan,{assetBase:'/media/asset/'}),frameState.section==='main'?provider?.getFrame(frameState.sourceT):null]);
      if(!active)return;
      const target=canvas.current,ctx=target.getContext('2d'),g=themePreviewGeometry(plan.output);
      ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,160,90);ctx.setTransform(g.scale,0,0,g.scale,g.x,g.y);drawFrame(target,plan,t,frame,assets);
    })().catch(()=>{if(active)setError('Preview unavailable');});
    return()=>{active=false;};
  },[state.plan,id,time,provider]);
  return <Button class="theme-card" aria-label={`Theme ${id}`} aria-pressed={state.composition.theme===id} onClick={()=>store.change('theme',id)}><canvas ref={canvas} width="160" height="90" aria-hidden="true"/><span title={error}>{id[0].toUpperCase()+id.slice(1)}</span></Button>;
}
// Three live mini previews of the current moment; the card chrome around them belongs to the Appearance panel.
export function ThemeCards(props){return <div class="theme-cards" role="group" aria-label="Theme">{['clean','dark','bold'].map(id=><ThemeCard key={id} id={id} {...props}/>)}</div>;}
