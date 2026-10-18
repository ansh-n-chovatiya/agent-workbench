import { h } from 'preact';
import * as P from '@radix-ui/react-slider';
export function Slider({'aria-label':label,id,...props}) { return <P.Root className="ui-slider" {...props}><P.Track className="ui-slider-track"><P.Range className="ui-slider-range" /></P.Track><P.Thumb id={id} aria-label={label} className="ui-slider-thumb" /></P.Root>; }
