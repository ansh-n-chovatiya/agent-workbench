export function themePreviewGeometry(output,width=160,height=90) {
  const scale=Math.min(width/output.width,height/output.height);
  return {scale,x:(width-output.width*scale)/2,y:(height-output.height*scale)/2,width,height};
}
