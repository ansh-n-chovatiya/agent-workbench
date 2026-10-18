const tabs = [...document.querySelectorAll('[role="tab"]')];
function selectTab(tab) {
  for (const candidate of tabs) {
    const selected = candidate === tab;
    candidate.setAttribute('aria-selected', String(selected));
    candidate.tabIndex = selected ? 0 : -1;
    document.getElementById(candidate.getAttribute('aria-controls')).hidden = !selected;
  }
}
for (const [index, tab] of tabs.entries()) {
  tab.addEventListener('click', () => selectTab(tab));
  tab.addEventListener('keydown', (event) => {
    let next;
    if (event.key === 'ArrowRight') next = tabs[(index + 1) % tabs.length];
    if (event.key === 'ArrowLeft') next = tabs[(index + tabs.length - 1) % tabs.length];
    if (event.key === 'Home') next = tabs[0];
    if (event.key === 'End') next = tabs.at(-1);
    if (next) { event.preventDefault(); selectTab(next); next.focus(); }
  });
}
let toastTimer;
for (const button of document.querySelectorAll('[data-plan]')) {
  button.addEventListener('click', () => {
    // Selection feedback remains local even when the recorder blocks the write.
    void fetch('/api/choose', { method: 'POST' }).catch(() => {});
    const toast = document.getElementById('plan-toast');
    toast.textContent = `${button.dataset.plan} selected. Your plan is ready to explore.`;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 5000);
  });
}
document.querySelector('form')?.addEventListener('submit', (event) => {
  event.preventDefault();
  const confirmation = document.getElementById('confirmation');
  confirmation.textContent = 'Thank you. Your message has been received in this local demo.';
  confirmation.hidden = false;
});
