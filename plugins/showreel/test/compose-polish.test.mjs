import test from 'node:test';
import assert from 'node:assert/strict';
import { overlaySafeArea, anchor, plateSize, measurePlate, fitPlate, box, calloutGeometry } from '../scripts/lib/compose/templates/shared.mjs';
import { TEMPLATES, validateParams } from '../scripts/lib/compose/templates/index.mjs';
import { THEMES } from '../scripts/lib/compose/themes.mjs';
import { layoutFor, presetOutput, verticalCaptionMetrics } from '../scripts/lib/compose/layout.mjs';
const f={width:1920,height:1080,theme:THEMES.clean,layout:{frame:{x:160,y:80,w:1600,h:900},caption:{x:0,y:900,w:1920,h:180}},mapSource:({x,y})=>({x:100+2*x,y:50+2*y})};
const contains=(o,r)=>r.x>=o.x&&r.y>=o.y&&r.x+r.w<=o.x+o.w+1e-8&&r.y+r.h<=o.y+o.h+1e-8;
test('safe area insets frame and removes caption overlap on every side',()=>{
  assert.deepEqual(overlaySafeArea(f),{x:208,y:128,w:1504,h:772});
  assert.deepEqual(overlaySafeArea(f,'canvas'),{x:0,y:0,w:1920,h:1080});
  for(const c of [{x:0,y:0,w:1920,h:200},{x:0,y:800,w:1920,h:280},{x:0,y:0,w:400,h:1080},{x:1500,y:0,w:420,h:1080}]){
    const r=overlaySafeArea({...f,layout:{frame:f.layout.frame,caption:c}});
    assert.ok(contains(f.layout.frame,r));assert.ok(r.x>=c.x+c.w||r.y>=c.y+c.h||r.x+r.w<=c.x||r.y+r.h<=c.y);
  }
  for(const position of TEMPLATES['lower-third'].params.position.values){
    const p={...TEMPLATES['lower-third'].defaults,position,offsetX:100,offsetY:-100};
    assert.ok(contains(overlaySafeArea(f),fitPlate(f,p,{w:400,h:100})));
  }
  assert.deepEqual(anchor(f,TEMPLATES['lower-third'].defaults),{x:208,y:900});
});
test('plates measure fonts, pad by em, enforce minimum width and grow with text',()=>{
  const measure=(s,size)=>({width:s.length*size*.5});
  const short=plateSize([{text:'Help',size:30}],measure,{minWidth:100});
  assert.deepEqual(short,{w:114,h:70.5,px:27,py:16.5,em:30});
  assert.equal(plateSize([{text:'A',size:30}],measure,{minWidth:100}).w,100);
  const long=plateSize([{text:'A longer label',size:30},{text:'Subtitle',size:20}],measure);
  assert.ok(long.w>short.w);assert.equal(long.h,95.5);
  const fonts=[],ctx={font:'',measureText(s){fonts.push(this.font);return {width:s.length*10};}};
  measurePlate(ctx,{...f,theme:THEMES.bold},[{text:'Name',size:30},{text:'Subtitle',size:20}]);
  assert.deepEqual(fonts,['700 30px "Space Grotesk"','700 20px "Space Grotesk"']);
});
test('auto callout avoids target, stays safe and starts leader on its edge',()=>{
  const p=TEMPLATES['callout-arrow'].defaults,safe=overlaySafeArea(f);assert.equal(p.position,'auto');
  for(const x of [safe.x+1,safe.x+safe.w/2,safe.x+safe.w-1])for(const y of [safe.y+1,safe.y+safe.h/2,safe.y+safe.h-1]){
    const target={x,y},g=calloutGeometry(f,p,{w:220,h:65},target),r=g.plate;
    assert.ok(contains(safe,r));assert.ok(x<r.x||x>r.x+r.w||y<r.y||y>r.y+r.h);assert.deepEqual(g.target,target);
    assert.ok(Math.abs(g.start.x-r.x)<1e-6||Math.abs(g.start.x-r.x-r.w)<1e-6||Math.abs(g.start.y-r.y)<1e-6||Math.abs(g.start.y-r.y-r.h)<1e-6);
  }
  const explicit=calloutGeometry(f,{...p,position:'bottom-left'},{w:220,h:65},{x:800,y:300});
  assert.equal(explicit.plate.x,safe.x);assert.equal(explicit.plate.y+explicit.plate.h,safe.y+safe.h);
});
test('source boxes pad page pixels before mapping and support centre origin',()=>{
  const p={...TEMPLATES['highlight-box'].defaults,x:320,y:180,width:100,height:60};
  assert.deepEqual(box(f,p),{x:728,y:398,w:224,h:144});assert.deepEqual(box(f,{...p,origin:'center'}),{x:628,y:338,w:224,h:144});
  assert.deepEqual(box(f,{...p,pad:0}),{x:740,y:410,w:200,h:120});
  for(const id of ['highlight-box','spotlight'])assert.match(TEMPLATES[id].help,/TOP-LEFT.*capture scale 1.*centre.*pad/);
});
test('schemas expose placement and reject invalid geometry choices',()=>{
  for(const t of Object.values(TEMPLATES)){
    assert.equal(t.defaults.placement,['title-card','outro-card','animated-gradient','logo-sting'].includes(t.id)?'canvas':'frame');
    assert.deepEqual(validateParams(t,{placement:'canvas'}),[]);assert.ok(validateParams(t,{placement:'page'}).length);
  }
  assert.equal(validateParams(TEMPLATES.spotlight,{origin:'bad',pad:-1}).length,2);
});
test('phone aspect, caption wrapping and safe bounds hold at 1080 and 4k',()=>{
  for(const size of ['1080','4k'])for(const source of [{width:519,height:1123},{width:390,height:844}])for(const safeZones of [true,false])for(const mode of ['band','overlay']){
    const output=presetOutput('vertical',size),composition={layout:{safeZones},captions:{enabled:true,mode,fontSizePct:3.9,maxLines:3}};
    const short=layoutFor({output,source,composition,captionTexts:['Hi']});
    const long=layoutFor({output,source,composition,captionTexts:['A long caption with enough text to need several lines underneath the video frame']});
    for(const l of [short,long]){
      assert.ok(Math.abs(l.frame.w/l.frame.h-source.width/source.height)/(source.width/source.height)<.005);
      assert.ok(contains(l.safe,l.frame));assert.ok(contains(l.safe,l.caption));assert.ok(l.caption.y>=l.frame.y+l.frame.h);
      assert.deepEqual(l.frame,l.content);assert.equal(l.caption.w,Math.round(output.width*.88));
    }
    assert.ok(long.caption.h>short.caption.h);assert.ok(long.frame.h<short.frame.h);
  }
  const metrics=verticalCaptionMetrics(presetOutput('vertical'),{maxLines:3},['one two three four five six'],s=>s.length*70);
  assert.equal(metrics.lines,3);assert.equal(metrics.size,1920*.039);
});

function drawingContext() {
  const calls=[];
  const ctx={globalAlpha:1,font:'',calls,measureText(s){return {width:s.length*Number.parseFloat(this.font.split(' ')[1])*.5};}};
  for(const method of ['save','restore','beginPath','fill','stroke','fillRect','roundRect','arc','moveTo','lineTo','fillText'])
    ctx[method]=(...args)=>calls.push({method,args,font:ctx.font,fill:ctx.fillStyle,stroke:ctx.strokeStyle,alpha:ctx.globalAlpha,lineWidth:ctx.lineWidth,lineCap:ctx.lineCap});
  return ctx;
}
test('plates use theme ink, compact measurements, badge circle and exact arrow endpoint',()=>{
  for(const theme of Object.values(THEMES)){
    const frame={...f,theme};
    const ctx=drawingContext(),t=TEMPLATES['lower-third'];t.draw(ctx,frame,{...t.defaults,name:'Help',subtitle:'Hi'},{progress:.5});
    const plate=ctx.calls.find(c=>c.method==='roundRect');assert.ok(plate.args[2]<200);
    assert.equal(plate.args[4],1080*.028*.5);assert.equal(plate.alpha,.96);
    assert.ok(ctx.calls.filter(c=>c.method==='fillText').every(c=>c.fill===theme.overlay.onSurface));
    assert.ok(ctx.calls.some(c=>c.method==='stroke'&&c.lineWidth===1&&c.stroke===theme.overlay.surfaceBorder));
    const badge=drawingContext(),b=TEMPLATES['step-badge'];b.draw(badge,frame,b.defaults,{progress:.5});
    assert.ok(badge.calls.some(c=>c.method==='arc'));
    assert.equal(badge.calls.find(c=>c.method==='fillText'&&c.args[0]==='1').fill,theme.overlay.onAccent);
    const arrow=drawingContext(),a=TEMPLATES['callout-arrow'];a.draw(arrow,frame,a.defaults,{progress:.5});
    const target=f.mapSource(a.defaults);
    assert.equal(arrow.calls.filter(c=>c.method==='lineTo'&&c.args[0]===target.x&&c.args[1]===target.y).length,2);
    assert.ok(arrow.calls.some(c=>c.method==='stroke'&&c.lineWidth===3&&c.lineCap==='round'));
  }
});
test('portrait template cards keep canvas backgrounds and constrain display text by width',()=>{
  for(const id of ['title-card','outro-card']){
    const ctx=drawingContext(),t=TEMPLATES[id];
    t.draw(ctx,{...f,width:1080,height:1920},t.defaults,{progress:.5});
    const plate=ctx.calls.find(c=>c.method==='roundRect');assert.deepEqual(plate.args.slice(0,4),[0,0,1080,1920]);
    for(const text of ctx.calls.filter(c=>c.method==='fillText')){
      assert.ok(Number.parseFloat(text.font.split(' ')[1])<=1080*1.25*.075);assert.equal(text.args[3],1080*.84);
    }
  }
});
test('oversized callouts still leave the target clear in narrow frames',()=>{
  const frame={...f,width:1080,height:1920,layout:{frame:{x:200,y:135,w:680,h:1400}}};
  const safe=overlaySafeArea(frame),target={x:safe.x+safe.w/2,y:safe.y+safe.h/2};
  const {plate:r}=calloutGeometry(frame,TEMPLATES['callout-arrow'].defaults,{w:4000,h:2000},target);
  assert.ok(contains(safe,r));assert.ok(target.x<r.x||target.x>r.x+r.w||target.y<r.y||target.y>r.y+r.h);
});
