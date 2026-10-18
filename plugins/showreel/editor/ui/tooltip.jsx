import { h } from 'preact';
import * as P from '@radix-ui/react-tooltip';
export const TooltipProvider = P.Provider;
export function Tooltip({text,children}) { return <P.Root><P.Trigger asChild><span className="tooltip-trigger">{children}</span></P.Trigger><P.Portal><P.Content sideOffset={5} className="ui-tooltip">{text}<P.Arrow /></P.Content></P.Portal></P.Root>; }
