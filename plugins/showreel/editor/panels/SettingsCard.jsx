import { h } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { ChevronRight, EllipsisVertical, RotateCcw } from 'lucide-preact';
import { Button } from '../ui/button.jsx';
import { Popover } from '../ui/popover.jsx';

// A rounded section card: icon, sentence-case title, optional one-line description, rows, and a collapsed Advanced section with a count badge.
// A card with only advanced rows collapses as a whole: its header is the toggle.
export function SettingsCard({ id, title, icon: Icon, description, badge, children, advanced, advancedCount, forceOpen = false, onReset, actions }) {
  const [open, setOpen] = useState(false);
  useEffect(() => { if (forceOpen) setOpen(true); }, [forceOpen]);
  const count = advancedCount ?? (Array.isArray(advanced) ? advanced.length : 0);
  const hasPrimary = Array.isArray(children) ? children.some(Boolean) : !!children;
  const advancedOnly = !hasPrimary && !!advanced;
  const menu = onReset && <Popover label={`${title} options`} trigger={<Button size="icon" class="scard-menu" aria-label={`${title} options`}><EllipsisVertical size={14} aria-hidden="true" /></Button>}>
    <div class="menu"><Button size="sm" onClick={onReset}><RotateCcw size={13} aria-hidden="true" />Reset section</Button></div>
  </Popover>;
  const heading = <span class="scard-title">{Icon && <Icon size={15} aria-hidden="true" />}<h3 id={`${id}-title`}>{title}</h3>{badge}</span>;
  return <section class={`scard ${advancedOnly ? 'scard-collapsible' : ''} ${open ? 'open' : ''}`} data-card={id} aria-labelledby={`${id}-title`}>
    <header class="scard-head">
      {advancedOnly ? <button type="button" class="scard-toggle" aria-expanded={open} aria-controls={`${id}-advanced`} onClick={() => setOpen(v => !v)}>
        {heading}<span class="scard-count"><span class="sr-only">, </span>Advanced · {count}</span><ChevronRight size={14} class="chev" aria-hidden="true" /></button> : heading}
      {actions}{menu}
    </header>
    {description && <p class="scard-desc">{description}</p>}
    {hasPrimary && <div class="scard-rows">{children}</div>}
    {advanced && !advancedOnly && <div class="scard-advanced">
      <button type="button" class="scard-adv" aria-expanded={open} aria-controls={`${id}-advanced`} onClick={() => setOpen(v => !v)}><ChevronRight size={14} class="chev" aria-hidden="true" />Advanced<span class="scard-count">{count}</span></button>
    </div>}
    {advanced && open && <div class="scard-rows scard-rows-advanced" id={`${id}-advanced`}>{advanced}</div>}
  </section>;
}
