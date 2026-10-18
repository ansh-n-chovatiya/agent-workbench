import { h } from 'preact';
import * as P from '@radix-ui/react-dialog';
import { X } from 'lucide-preact';
import { Button } from './button.jsx';
import { Tooltip } from './tooltip.jsx';
export function Dialog({title,description,onClose,locked=false,children,className=''}) { return <P.Root open onOpenChange={open => {if(!open && !locked) onClose();}}><P.Portal><P.Overlay className="ui-overlay" /><P.Content className={`ui-dialog ${className}`} onEscapeKeyDown={e => {if(locked) e.preventDefault();}} onInteractOutside={e => e.preventDefault()} onKeyDown={e => e.stopPropagation()}><div className="dialog-heading"><P.Title>{title}</P.Title><Tooltip text={locked ? "Wait for the export to finish or cancel it" : "Close (Escape)"}><Button size="icon" aria-label={`Close ${title === 'Keyboard shortcuts' ? 'shortcuts' : title === 'Settings' ? 'settings' : 'export'}`} disabled={locked} onClick={onClose}><X size={16} aria-hidden="true" /></Button></Tooltip></div><P.Description className="setting-help">{description}</P.Description>{children}</P.Content></P.Portal></P.Root>; }
