import http from 'node:http';
import { planMove } from './cursor-path.mjs';

export function demoMoves() {
  const points = [
    { x: 80, y: 90 }, { x: 120, y: 100 }, { x: 530, y: 100 },
    { x: 100, y: 420 }, { x: 500, y: 430 }, { x: 300, y: 230 },
    { x: 310, y: 240 }, { x: 70, y: 430 }, { x: 80, y: 90 },
  ];
  return points.slice(1).map((to, index) => ({
    from: points[index], to, ...planMove(points[index], to, { key: `demo:${index}` }),
  }));
}

export function cursorDemoHtml() {
  return `<!doctype html><html lang="en"><meta charset="utf-8">
<title>Showreel cursor comparison</title><style>
body{margin:36px;background:#10151b;color:#eef4fa;font:18px system-ui}
main{display:flex;gap:24px;flex-wrap:wrap}h1{font-size:26px}h2{font-size:18px}
canvas{width:600px;max-width:100%;background:#19222c;border:1px solid #405164}
p{color:#b6c9d8}
</style><h1>Cursor motion study</h1><p>Eight seeded moves. Each move is one smooth stroke with a gentle arc and a soft landing.</p>
<main><section><h2>planned</h2><canvas id="planned" width="600" height="500"></canvas></section>
<section><h2>linear</h2><canvas id="linear" width="600" height="500"></canvas></section></main>
<script>
const moves = ${JSON.stringify(demoMoves())};
const canvases = ['planned', 'linear'].map((id) => document.getElementById(id));
const trails = [[], []];
let index = 0;
let start = performance.now();

function grid(ctx) {
  ctx.clearRect(0, 0, 600, 500);
  ctx.strokeStyle = '#283745';
  ctx.lineWidth = 1;
  for (let x = 0; x < 600; x += 25) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 500); ctx.stroke();
  }
  for (let y = 0; y < 500; y += 25) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(600, y); ctx.stroke();
  }
}

function draw(canvas, point, trail, now) {
  const ctx = canvas.getContext('2d');
  grid(ctx);
  trail.push({ ...point, at: now });
  while (trail.length && now - trail[0].at > 350) trail.shift();
  for (const p of trail) {
    ctx.globalAlpha = (1 - (now - p.at) / 350) * 0.5;
    ctx.fillStyle = '#7ddfc0';
    ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.save();
  ctx.translate(point.x, point.y);
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(2, 22); ctx.lineTo(8, 16);
  ctx.lineTo(13, 27); ctx.lineTo(18, 24); ctx.lineTo(13, 14); ctx.lineTo(23, 14);
  ctx.closePath();
  ctx.fillStyle = '#fff'; ctx.fill();
  ctx.strokeStyle = '#10151b'; ctx.stroke();
  ctx.restore();
}

function tick(now) {
  let move = moves[index];
  let elapsed = now - start;
  if (elapsed > move.durationMs + 650) {
    index = (index + 1) % moves.length;
    start = now;
    elapsed = 0;
    move = moves[index];
  }
  const t = Math.min(elapsed, move.durationMs);
  const fraction = t / move.durationMs;
  const samples = move.samples;
  let next = samples.findIndex((point) => point.t >= t);
  if (next < 0) next = samples.length - 1;
  const a = samples[Math.max(0, next - 1)];
  const b = samples[next];
  const blend = b.t === a.t ? 1 : (t - a.t) / (b.t - a.t);
  const planned = { x: a.x + (b.x - a.x) * blend, y: a.y + (b.y - a.y) * blend };
  const linear = {
    x: move.from.x + (move.to.x - move.from.x) * fraction,
    y: move.from.y + (move.to.y - move.from.y) * fraction,
  };
  draw(canvases[0], planned, trails[0], now);
  draw(canvases[1], linear, trails[1], now);
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
</script></html>`;
}

export async function cursorDemo({ log = console.log } = {}) {
  const { chromium } = await import('playwright');
  const html = cursorDemoHtml();
  let browser;
  const server = http.createServer((request, response) => {
    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    response.end(html);
  });
  try {
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', () => { server.off('error', reject); resolve(); });
    });
    const url = `http://127.0.0.1:${server.address().port}`;
    log(url);
    browser = await chromium.launch({ headless: false });
    const page = await browser.newPage({ viewport: { width: 1300, height: 700 } });
    const closed = new Promise((resolve) => {
      page.once('close', resolve);
      browser.once('disconnected', resolve);
    });
    await page.goto(url);
    await closed;
  } finally {
    try { await browser?.close(); }
    finally {
      if (server.listening) {
        server.closeAllConnections();
        await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
      }
    }
  }
}
