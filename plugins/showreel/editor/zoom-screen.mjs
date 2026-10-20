// Crop and pointer coordinates use the same camera transform as draw.mapSourcePoint.
// `size` is the displayed canvas size; sourceSize is capture pixels, viewport is CSS pixels.
export function zoomScreenBox(box, plan, camera, size) {
  const f = plan.layout.content ?? plan.layout.frame;
  const sx = f.w * camera.z * plan.scale / plan.sourceSize.width * size.width / plan.output.width;
  const sy = f.h * camera.z * plan.scale / plan.sourceSize.height * size.height / plan.output.height;
  return {x:(f.x+f.w/2)*size.width/plan.output.width+(box.x-camera.cx)*sx,
    y:(f.y+f.h/2)*size.height/plan.output.height+(box.y-camera.cy)*sy,w:box.w*sx,h:box.h*sy,sx,sy};
}
export function screenToZoomPoint(point, plan, camera, size) {
  const origin = zoomScreenBox({x:0,y:0,w:0,h:0},plan,camera,size);
  return {x:(point.x-origin.x)/origin.sx,y:(point.y-origin.y)/origin.sy};
}
export function regionAtTime(region,t) {
  const key = region.keyframes.findLast(k=>k.t<=t) ?? region.keyframes[0];
  return {...region,keyframes:key ? [key] : []};
}
