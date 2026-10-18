import { h } from 'preact';
import * as Primitive from '@radix-ui/react-label';
export const Label = ({class: klass, className, ...props}) => <Primitive.Root className={['ui-label',klass,className].filter(Boolean).join(' ')} {...props} />;
