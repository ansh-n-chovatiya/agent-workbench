import test from 'node:test';
import assert from 'node:assert/strict';
import { layoutFor, presetOutput, verticalCaptionMetrics } from '../scripts/lib/compose/layout.mjs';
const contains=(o,r)=>r.x>=o.x&&r.y>=o.y&&r.x+r.w<=o.x+o.w+1e-8&&r.y+r.h<=o.y+o.h+1e-8;
test('phone aspect, caption wrapping and safe bounds hold at 1080 and 4k',()=>{
  for(const size of ['1080','4k'])for(const source of [{width:519,height:1123},{width:390,height:844}])for(const safeZones of [true,false])for(const mode of ['band','overlay']){
    const output=presetOutput('vertical',size),composition={layout:{safeZones},captions:{enabled:true,mode,fontSizePct:3.0,maxLines:2}};
    const short=layoutFor({output,source,composition,captionTexts:['Hi']});
    const long=layoutFor({output,source,composition,captionTexts:['A long caption with enough text to need several lines underneath the video frame']});
    for(const l of [short,long]){
      assert.ok(Math.abs(l.frame.w/l.frame.h-source.width/source.height)/(source.width/source.height)<.005);
      assert.ok(contains(l.safe,l.frame));assert.ok(contains(l.safe,l.caption));assert.ok(l.caption.y-(l.frame.y+l.frame.h)>=Math.ceil(output.height*.02));
      assert.deepEqual(l.frame,l.content);assert.equal(l.caption.w,Math.round(output.width*.88));
    }
    assert.ok(long.caption.h>short.caption.h);assert.ok(long.frame.h<short.frame.h);
  }
  const metrics=verticalCaptionMetrics(presetOutput('vertical'),{maxLines:3},['one two three four five six'],s=>s.length*70);
  assert.equal(metrics.lines,2);assert.equal(metrics.size,1920*3/100);
});

