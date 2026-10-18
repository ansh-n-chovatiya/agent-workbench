import { h } from 'preact';
import * as P from '@radix-ui/react-select';
import { Check, ChevronDown, ChevronUp } from 'lucide-preact';
export const SelectTrigger = ({children,...props}) => <P.Trigger className="ui-select ui-input" {...props}>{children}<P.Icon><ChevronDown size={16} aria-hidden="true" /></P.Icon></P.Trigger>;
export const SelectItem = ({children,...props}) => <P.Item className="ui-select-item" {...props}><P.ItemText>{children}</P.ItemText><P.ItemIndicator><Check size={16} aria-hidden="true" /></P.ItemIndicator></P.Item>;
export const SelectContent = ({children}) => <P.Portal><P.Content position="popper" sideOffset={5} className="ui-popover ui-select-content"><P.ScrollUpButton className="select-scroll"><ChevronUp size={16} aria-hidden="true" /></P.ScrollUpButton><P.Viewport>{children}</P.Viewport><P.ScrollDownButton className="select-scroll"><ChevronDown size={16} aria-hidden="true" /></P.ScrollDownButton></P.Content></P.Portal>;
export function Select({value,onValueChange,options,disabled,...props}) { return <P.Root value={String(value ?? '')} onValueChange={onValueChange} disabled={disabled}><SelectTrigger {...props}><P.Value /></SelectTrigger><SelectContent>{options.map(option => <SelectItem key={String(option.value ?? option)} value={String(option.value ?? option)}>{option.label ?? String(option)}</SelectItem>)}</SelectContent></P.Root>; }
