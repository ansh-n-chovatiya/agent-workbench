// A compositor heartbeat keeps still holds represented at display cadence. It is
// out of flow and almost transparent so measurement does not alter page layout.
export function captureInit(scale) {
  return `(() => {
    const install = () => {
      document.documentElement.style.zoom = ${JSON.stringify(String(scale))};
      const style = document.createElement('style');
      style.textContent = '@keyframes sr-record-beat{to{transform:translateX(40px)}}'
        + '#sr-record-beat{position:fixed;left:0;top:0;width:2px;height:2px;'
        + 'background:#000;opacity:.02;pointer-events:none;z-index:2147483647;'
        + 'animation:sr-record-beat .4s linear infinite alternate}';
      const beat = document.createElement('div');
      beat.id = 'sr-record-beat';
      document.head.append(style);
      document.body.append(beat);
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', install, {once:true});
    } else install();
  })();`;
}

export async function startScreencast(page, onFrame) {
  const cdp = await page.context().newCDPSession(page);
  let stopped = false;
  const listener = (frame) => {
    void cdp.send('Page.screencastFrameAck', { sessionId: frame.sessionId }).catch(() => {});
    if (!stopped) onFrame(Buffer.from(frame.data, 'base64'), frame.metadata.timestamp);
  };
  cdp.on('Page.screencastFrame', listener);
  try {
    const { width, height } = page.viewportSize();
    await cdp.send('Page.startScreencast', {
      format: 'jpeg', quality: 90, everyNthFrame: 1, maxWidth: width, maxHeight: height,
    });
  } catch (error) {
    try { throw error; } finally { await cdp.detach(); }
  }
  return async () => {
    if (stopped) return;
    stopped = true;
    try { await cdp.send('Page.stopScreencast'); }
    finally {
      cdp.off('Page.screencastFrame', listener);
      await cdp.detach();
    }
  };
}
