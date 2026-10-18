import { h } from 'preact';
import * as P from '@radix-ui/react-checkbox';
import { Check } from 'lucide-preact';
export const Checkbox = props => <P.Root className="ui-checkbox" {...props}><P.Indicator><Check size={14} aria-hidden="true" /></P.Indicator></P.Root>;
