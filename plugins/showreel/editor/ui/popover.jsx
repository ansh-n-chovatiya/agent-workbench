import { h } from 'preact';
import * as P from '@radix-ui/react-popover';
export function Popover({trigger,children,open,onOpenChange,label}) { return <P.Root open={open} onOpenChange={onOpenChange}><P.Trigger asChild>{trigger}</P.Trigger><P.Portal><P.Content aria-label={label} sideOffset={6} collisionPadding={12} className="ui-popover" onKeyDown={e => e.stopPropagation()}>{children}<P.Arrow className="popover-arrow" /></P.Content></P.Portal></P.Root>; }
