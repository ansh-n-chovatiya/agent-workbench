import { setTimeout as sleep } from 'node:timers/promises';
import { hygieneScript } from './hygiene.mjs';
import { installWriteGuard } from './write-guard.mjs';
import { startEncoder } from './frame-sink.mjs';
import { captureInit, startScreencast } from './screencast.mjs';
import { executeScenario, navigateRecording } from './actions.mjs';
import { scaledViewport, emptyEvents } from './timing.mjs';

export class RecordingSession {
  constructor(browser, config, scale, fps = 60) {
    this.browser = browser;
    this.config = config;
    this.scale = scale;
    this.fps = fps;
    this.viewport = scaledViewport(config.viewport, scale);
    this.events = emptyEvents(config.viewport, scale);
    this.pages = [];
    this.firstTs = null;
    this.previousFrameTs = -Infinity;
    this.recording = false;
    this.switchChain = Promise.resolve();
    this.now = () => this.firstTs === null ? 0 : Math.max(0, Date.now() / 1000 - this.firstTs);
    this.cursor = { x: config.viewport.width / 2, y: config.viewport.height / 2 };
    this.cookies = config.hygiene.dismissCookieBanners;
  }

  async open(url, storageState) {
    this.context = await this.browser.newContext({
      viewport: this.viewport, deviceScaleFactor: 1, storageState,
    });
    this.context.setDefaultTimeout(5000);
    await this.context.addInitScript({ content: hygieneScript(this.config.hygiene) });
    await this.context.addInitScript({ content: captureInit(this.scale) });
    await installWriteGuard(this.context, { ...this.config, onBlocked: (event) => {
      if (this.recording) this.events.blocked.push({ ...event, t: this.now() });
    } });
    this.context.on('page', (page) => this.remember(page));
    this.initial = await this.context.newPage();
    await navigateRecording(this.initial, url, this.scale, this.cookies);
  }

  remember(page) {
    const index = this.pages.push(page) - 1;
    page.on('framenavigated', (frame) => {
      if (this.recording && frame === page.mainFrame()) {
        this.events.tabs.push({ t: this.now(), index, url: page.url() });
      }
    });
    if (this.recording) {
      this.events.tabs.push({ t: this.now(), index, url: page.url() });
      void this.switchTo(page);
    }
  }

  receiveFrame(jpeg, ts) {
    try {
      // Switching targets can resend the compositor's last snapshot.
      if (ts <= this.previousFrameTs) return;
      this.previousFrameTs = ts;
      // A 30 fps request samples the display cadence without changing CDP acks.
      if (this.fps === 30 && ts - (this.lastSentTs ?? -Infinity) < 1 / 30 - 0.002) return;
      if (this.encoder.push(jpeg, ts)) {
        this.firstTs ??= ts;
        this.lastSentTs = ts;
      }
    } catch (error) { this.failure ??= error; }
  }

  switchTo(page) {
    this.switchChain = this.switchChain.then(async () => {
      if (this.activePage === page) return;
      await this.stopCapture?.();
      this.stopCapture = null;
      await page.bringToFront();
      this.activePage = page;
      this.stopCapture = await startScreencast(page, (jpeg, ts) => this.receiveFrame(jpeg, ts));
    });
    this.switchChain.catch((error) => { this.failure ??= error; });
    return this.switchChain;
  }

  async pageFor(index) {
    const deadline = Date.now() + 5000;
    while (!this.pages[index] && Date.now() < deadline) await sleep(25);
    const page = this.pages[index];
    if (!page || page.isClosed()) throw new Error(`tab ${index} not found`);
    if (this.recording) await this.switchTo(page);
    return page;
  }

  value(step, action) {
    return action.sensitive ? process.env[`SHOWREEL_SECRET_${step.id.toUpperCase()}`] : action.value;
  }

  async rehearse(steps, url) {
    await executeScenario(this, steps, { rehearsal: true });
    for (const page of this.pages.slice(1)) await page.close();
    this.pages.splice(1);
    await navigateRecording(this.initial, url, this.scale, this.cookies);
  }

  async run(steps, outFile) {
    this.encoder = await startEncoder({ browser: this.browser, ...this.viewport, outFile });
    this.recording = true;
    this.events.tabs.push({ t: 0, index: 0, url: this.initial.url() });
    await this.switchTo(this.initial);
    const deadline = Date.now() + 10000;
    while (this.firstTs === null && !this.failure && Date.now() < deadline) await sleep(10);
    if (this.failure) throw this.failure;
    if (this.firstTs === null) throw new Error('Screencast produced no frames within 10 seconds');
    await executeScenario(this, steps);
    if (this.failure) throw this.failure;
    await this.switchChain;
    await this.stopCapture();
    this.stopCapture = null;
    this.recording = false;
    const stats = await this.encoder.finish(Date.now() / 1000);
    this.encoder = null;
    return stats;
  }

  async close() {
    this.recording = false;
    try {
      await this.switchChain.catch(() => {});
      await this.stopCapture?.().catch(() => {});
    } finally {
      try { await this.encoder?.finish(Date.now() / 1000).catch(() => {}); }
      finally { await this.context?.close(); }
    }
  }
}
