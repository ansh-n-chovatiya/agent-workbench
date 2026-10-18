import { safeImagePath } from '../compose/composition.mjs';

export const COOKIE_NAME = 'showreel_editor';
export const validHost = (host, port) => host === `127.0.0.1:${port}` || host === `localhost:${port}`;
export const validOrigin = (origin, host, method) => method === 'GET' || (origin === undefined || origin === `http://${host}`);
export function requestToken({ url, headers }) {
  const query = new URL(url, 'http://localhost').searchParams.get('token');
  const bearer = /^Bearer (.+)$/.exec(headers.authorization ?? '')?.[1];
  const cookie = (headers.cookie ?? '').split(';').map(s => s.trim()).find(s => s.startsWith(`${COOKIE_NAME}=`))?.slice(COOKIE_NAME.length + 1);
  return query ?? bearer ?? cookie;
}
export const authorized = (request, token) => requestToken(request) === token;
export const sessionCookie = token => `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Strict`;
export function stripToken(url) {
  const parsed = new URL(url, 'http://localhost'); parsed.searchParams.delete('token');
  return parsed.pathname + parsed.search;
}
export function safeRelativePath(encoded) {
  let decoded;
  try { decoded = decodeURIComponent(encoded); } catch { return null; }
  return safeImagePath(decoded) && !decoded.includes('\\') && !decoded.split('/').includes('.') ? decoded : null;
}
// null = no range; false = unsatisfiable/invalid (including multiple ranges).
export function parseRange(value, size) {
  if (value === undefined) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(value);
  if (!match || (!match[1] && !match[2]) || !Number.isSafeInteger(size) || size <= 0) return false;
  let start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
  const end = match[1] && match[2] ? Math.min(size - 1, Number(match[2])) : size - 1;
  if ((match[1] && !Number.isSafeInteger(Number(match[1]))) || (match[2] && !Number.isSafeInteger(Number(match[2])))
    || !Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start > end || start >= size) return false;
  return { start, end };
}
export function formatSSE(event, data) {
  if (!/^[a-z][a-z0-9-]*$/i.test(event)) throw new Error('Invalid SSE event');
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}
