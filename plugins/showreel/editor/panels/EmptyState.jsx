import { h } from 'preact';
// Illustrated-style empty, loading and error states: icon, title, one line and a primary action. Never raw empty space.
export function EmptyState({ icon: Icon, title, line, action, tone = 'neutral', spin = false, compact = false, role = 'status' }) {
  return <div class={`empty-state tone-${tone} ${compact ? 'compact' : ''}`} role={role}>
    {Icon && <span class="empty-icon" aria-hidden="true"><Icon size={compact ? 16 : 20} class={spin ? 'spin' : ''} /></span>}
    <strong class="empty-title">{title}</strong>
    {line && <p class="empty-line">{line}</p>}
    {action && <div class="empty-action">{action}</div>}
  </div>;
}
