import { h } from 'preact';
import { forwardRef } from 'preact/compat';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import { cn } from './cn.js';
const variants = cva('ui-button inline-flex items-center justify-center gap-2 rounded-md text-[13px] font-semibold transition-colors disabled:opacity-40', { variants: { variant: { default:'bg-primary text-primary-foreground', secondary:'bg-muted text-foreground', outline:'border border-border bg-transparent', ghost:'bg-transparent', destructive:'bg-destructive text-white' }, size: { default:'h-8 px-3', sm:'h-7 px-2', icon:'h-8 w-8 p-0' } }, defaultVariants: { variant:'ghost', size:'default' } });
export const Button = forwardRef(({ class: klass, className, variant, size, asChild, ...props }, ref) => { const Component = asChild ? Slot : 'button'; return <Component ref={ref} type="button" className={cn(variants({variant,size}),klass,className)} {...props} />; });
