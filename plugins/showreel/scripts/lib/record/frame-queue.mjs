// A slow encoder costs frames, never unbounded JPEG memory or timestamp drift.
export class FrameQueue {
  constructor(limit = 8) {
    if (!Number.isInteger(limit) || limit < 1) throw new Error('maxBacklog must be a positive integer');
    this.limit = limit;
    this.queue = [];
    this.frames = 0;
    this.dropped = 0;
    this.maxBacklog = 0;
    this.firstTs = null;
    this.lastTs = null;
    this.closed = false;
  }

  push(data, ts) {
    if (this.closed) throw new Error('Encoder is finished');
    if (!Number.isFinite(ts) || (this.lastTs !== null && ts <= this.lastTs)) {
      throw new Error('Frame timestamps must be finite and strictly increasing');
    }
    if (this.queue.length > this.limit) { this.dropped++; return false; }
    this.firstTs ??= ts;
    this.lastTs = ts;
    this.frames++;
    this.queue.push({ data, ts: ts - this.firstTs });
    this.maxBacklog = Math.max(this.maxBacklog, this.queue.length);
    this.wake?.();
    return true;
  }

  async next() {
    if (!this.queue.length && !this.closed) {
      if (this.wake) throw new Error('Only one encoder consumer is allowed');
      await new Promise((resolve) => { this.wake = resolve; });
      this.wake = null;
    }
    return this.queue.shift() ?? null;
  }

  end(ts = this.lastTs) {
    this.endTs = this.firstTs === null ? 0 : Math.max(0, (ts ?? this.lastTs) - this.firstTs);
    this.closed = true;
    this.wake?.();
  }
}

export function encoderSettings(width, height) {
  if (![width, height].every((n) => Number.isInteger(n) && n > 0)) {
    throw new Error('Encoder dimensions must be positive integers');
  }
  return { width, height, bitrate: Math.min(60_000_000, width * height * 6) };
}
