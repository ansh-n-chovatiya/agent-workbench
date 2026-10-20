// Local-only benchmark routes. Submitted values are never reflected or logged.
import { randomBytes } from 'node:crypto';
const nav = '<nav aria-label="Main navigation"><a href="/">Home</a><a href="/account">Account</a><a href="/reports">Reports</a><a href="/long">Guide</a><a href="/login">Login</a></nav>';
const page = (title, body) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Fieldnotes — ${title}</title><link rel="stylesheet" href="/style.css"></head><body class="benchmark-app">${nav}<main class="benchmark"><section><h1>${title}</h1>${body}</section></main><footer>Fieldnotes · Local benchmark</footer></body></html>`;
const reports = ['Research summary', 'Delivery overview', 'Team activity'];
async function form(req) {
  let bytes = 0, body = '';
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > 8192) throw new Error('Form too large');
    body += chunk;
  }
  return new URLSearchParams(body);
}
export function createBenchmarkRoutes() {
  const sessions = new Set();
  return async (req, res, pathname) => {
    if (!['/login', '/account', '/reports', '/long', '/reports/1', '/reports/2', '/reports/3'].includes(pathname)) return false;
    const send = (status, body, headers = {}) => {
      res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
      res.end(req.method === 'HEAD' ? undefined : body);
      return true;
    };
    const redirect = (url, headers) => send(303, '', { Location: url, ...headers });
    const cookie = req.headers.cookie?.split(';').map((part) => part.trim()).find((part) => part.startsWith('showreel_session='))?.slice('showreel_session='.length);
    if (pathname === '/account' && !sessions.has(cookie)) return redirect('/login');
    if (req.method === 'POST') {
      if (!['/login', '/account'].includes(pathname)) return send(405, 'Method not allowed');
      let data;
      try { data = await form(req); } catch { return send(413, 'Form too large'); }
      if (pathname === '/login') {
        if (!data.get('username')?.trim() || !data.get('password')) return send(400, page('Login', '<p>Username and password are required.</p>'));
        const token = randomBytes(24).toString('hex');
        sessions.add(token);
        return redirect('/account', { 'Set-Cookie': `showreel_session=${token}; HttpOnly; SameSite=Lax; Path=/` });
      }
      return redirect('/account?saved=1');
    }
    if (!['GET', 'HEAD'].includes(req.method)) return send(405, 'Method not allowed');
    if (pathname === '/login') return send(200, page('Login', '<p>Local fixture: any nonempty credentials work.</p><form method="post" action="/login"><label>Username<input name="username" autocomplete="username" required></label><label>Password<input type="password" name="password" autocomplete="current-password" required></label><button type="submit">Sign in</button></form>'));
    if (pathname === '/account') return send(200, page('Account', `<div class="table-wrap"><table><caption>Workspace activity</caption><thead><tr><th>Project</th><th>Status</th><th>Notes</th></tr></thead><tbody><tr><td>Research</td><td>Ready</td><td>12</td></tr><tr><td>Delivery</td><td>In progress</td><td>8</td></tr><tr><td>Review</td><td>Planned</td><td>4</td></tr></tbody></table></div><h2>Workspace settings</h2><form method="post" action="/account"><label>Workspace note<input name="workspace_note" type="text" autocomplete="off" required></label><button type="submit">Save settings</button></form>${new URL(req.url, 'http://fixture').searchParams.get('saved') === '1' ? '<p role="status">Settings saved in this local demo.</p>' : ''}`));
    if (pathname === '/reports') return send(200, page('Reports', `<ul>${reports.map((title, i) => `<li><a href="/reports/${i + 1}">${title}</a></li>`).join('')}</ul>`));
    if (pathname.startsWith('/reports/')) {
      const number = Number(pathname.split('/').at(-1));
      return send(200, page(reports[number - 1], `<p>Report ${number}: a deterministic view of workspace progress.</p><p>Completed items: ${number * 8}. Planned items: ${number * 12}.</p><a href="/reports">Back to reports</a>`));
    }
    return send(200, page('Workspace guide', '<p>Scroll to the final checklist.</p></section>' + ['Collect the evidence', 'Connect the decisions', 'Share the plan', 'Final checklist'].map((title, i) => `<section id="chapter-${i + 1}" class="long-chapter"><h2>${title}</h2><p>Chapter ${i + 1}: clear notes help every teammate follow the work.</p>${i === 3 ? '<a href="/account">Return to account</a>' : ''}</section>`).join('') + '<section><p>You have reached the end of the guide.</p>'));
  };
}
