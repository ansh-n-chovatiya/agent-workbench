// Topic order and panel routing are shared by the shell and its tests. Icons are lucide names exported from panels/icons.js.
export const RAIL_TOPICS = [
  {id:'zoom',label:'Zoom',icon:'ZoomIn'},
  {id:'cursor',label:'Cursor',icon:'MousePointer2'},
  {id:'appearance',label:'Appearance',icon:'Palette'},
  {id:'captions',label:'Captions',icon:'Captions'},
  {id:'audio',label:'Audio',icon:'AudioLines'},
  {id:'brand',label:'Brand',icon:'BadgeCheck'},
  {id:'output',label:'Export settings',icon:'SlidersHorizontal',divider:true},
];
export function panelFor(selection, topic = 'zoom') {
  return ({zoom:'zoom-selection',clip:'clip-selection',caption:'caption-selection'})[selection?.type]
    ?? (RAIL_TOPICS.some(t => t.id === topic) ? topic : 'zoom');
}
export const TOPIC_GROUPS = {zoom:['zoom'],cursor:['cursor'],appearance:['look','cards'],captions:['captions'],audio:['audio'],brand:[],output:['output']};
