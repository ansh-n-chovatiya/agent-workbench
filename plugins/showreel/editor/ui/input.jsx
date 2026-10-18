import { h } from 'preact';
import { forwardRef } from 'preact/compat';
import { cn } from './cn.js';
export const Input = forwardRef(({class: klass,className,...props},ref) => <input ref={ref} className={cn('ui-input h-8 w-full rounded-md border border-input bg-transparent px-2 text-[13px]',klass,className)} {...props} />);
