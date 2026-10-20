// Which actions a block offers (right-click, the Menu key and the floating mini toolbar). Pure: block in, actions out.
export const SPEED_PICKS = Object.freeze([1,2,4,8]);
const EPS = 1e-6;
export function menuActions(kind,item,{sourceT = 0} = {}) {
  if (kind === 'clip') {
    const inside = sourceT > item.start+0.1-EPS && sourceT < item.end-0.1+EPS;
    if (item.deleted) return [{id:'restore',label:'Restore clip',icon:'RotateCcw'}];
    return [
      {id:'split',label:'Split here',icon:'Scissors',disabled:!inside,hint:inside ? 'S' : 'Move the playhead inside this clip'},
      {id:'speed',label:'Speed',icon:'Gauge',picks:SPEED_PICKS.map(rate => ({rate,label:`${rate}x`,active:Math.abs(item.rate-rate) < EPS}))},
      {id:'delete',label:'Delete clip',icon:'Trash2',danger:true,hint:'Del'},
    ];
  }
  if (kind === 'zoom') return [
    item.source === 'auto' ? {id:'manual',label:'Switch to Manual',icon:'Hand'} : {id:'auto',label:'Switch to Auto',icon:'WandSparkles'},
    {id:'duplicate',label:'Duplicate',icon:'Copy'},
    {id:'delete',label:'Delete zoom',icon:'Trash2',danger:true,hint:'Del'},
  ];
  if (kind === 'caption') return [{id:'edit',label:'Edit text',icon:'Pencil',hint:'Enter'},{id:'delete',label:'Delete caption',icon:'Trash2',danger:true,hint:'Del'}];
  if (kind === 'voice') return [{id:'regenerate',label:'Regenerate voice',icon:'WandSparkles'},{id:'open-audio',label:'Open in Audio',icon:'Mic'}];
  if (kind === 'music') return [{id:'open-audio',label:'Open in Audio',icon:'Music'}];
  return [];
}
// The two or three most common actions for the floating mini toolbar.
export function quickActions(kind,item,context) {
  const all = menuActions(kind,item,context);
  const wanted = {clip:['split','delete','restore'],zoom:['auto','manual','duplicate','delete'],caption:['edit','delete'],voice:['regenerate'],music:[]}[kind] ?? [];
  return all.filter(a => wanted.includes(a.id)).slice(0,3);
}
