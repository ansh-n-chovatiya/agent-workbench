import { RULE_HEADER, ACTION_NAME } from '../write-rules.mjs';

export function isWriteAllowed({ method, url, headers = {} }, rules) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase())) return true;
  const normalized = Object.fromEntries(Object.entries(headers).map(([name, value]) =>
    [name.toLowerCase(), value]));
  return rules.some((rule) => {
    // Names require build-time resolution, which is outside Phase 3.
    if (ACTION_NAME.test(rule)) return false;
    const condition = rule.match(RULE_HEADER);
    const target = condition ? rule.slice(0, condition.index) : rule;
    if (condition && normalized[(condition[1] ?? 'next-action').toLowerCase()] !== condition[2]) {
      return false;
    }
    return target.startsWith('re:')
      ? new RegExp(target.slice(3)).test(url)
      : url.includes(target);
  });
}

function devSocket(url) {
  try {
    const parsed = new URL(url);
    return ['localhost', '127.0.0.1'].includes(parsed.hostname)
      && ['/_next/webpack-hmr', '/sockjs-node', '/__vite_hmr', '/ws']
        .some((part) => parsed.pathname.includes(part));
  } catch { return false; }
}

export async function installWriteGuard(context, {
  allowWrites = [], allowWebSockets = false, allowDevSockets = true, onBlocked,
}) {
  const blocked = [];
  const started = performance.now();
  function block(method, url) {
    // The recorder rebases these relative seconds onto the first encoded frame.
    const event = { method, url, t: (performance.now() - started) / 1000 };
    blocked.push(event);
    onBlocked?.({ ...event });
  }
  await context.route('**/*', async (route) => {
    const request = route.request();
    const info = { method: request.method(), url: request.url(), headers: request.headers() };
    if (isWriteAllowed(info, allowWrites)) return route.continue();
    block(info.method, info.url);
    await route.abort('blockedbyclient');
  });
  if (context.routeWebSocket) {
    await context.routeWebSocket('**/*', (socket) => {
      const url = socket.url();
      if (allowWebSockets || (allowDevSockets && devSocket(url))) return socket.connectToServer();
      block('WEBSOCKET', url);
      return socket.close();
    });
  }
  return { blocked: () => blocked.map((event) => ({ ...event })) };
}
