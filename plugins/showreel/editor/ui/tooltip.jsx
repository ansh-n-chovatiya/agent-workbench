import { h } from 'preact';
import * as P from '@radix-ui/react-tooltip';
export const TooltipProvider = P.Provider;
// Tooltips open above their trigger by default and flip only when there is no room, so they never sit on the row they describe.
export function Tooltip({text,children,side='top',align='center'}) { return <P.Root><P.Trigger asChild><span className="tooltip-trigger">{children}</span></P.Trigger><P.Portal><P.Content side={side} align={align} sideOffset={6} collisionPadding={8} className="ui-tooltip">{text}<P.Arrow /></P.Content></P.Portal></P.Root>; }
