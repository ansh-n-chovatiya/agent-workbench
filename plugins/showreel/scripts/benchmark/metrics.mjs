// Shared pure math and parsing: never require Claude or a network connection.
export function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b), mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
export const freshTokens = ({ input, output, cacheCreate }) => input + output + cacheCreate;
// Compare each run only with its own skill-activation floor.
export const marginalFreshTokens = (runFresh, floorFresh) =>
  nonnegative(runFresh) && nonnegative(floorFresh) ? Math.max(0, runFresh - floorFresh) : null;
const nonnegative = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0;
export function parseUsage(stdout) {
  const parsed = JSON.parse(stdout);
  const result = Array.isArray(parsed) ? parsed.findLast((item) => item.type === 'result') : parsed;
  if (!result || typeof result !== 'object') throw new Error('Claude returned no JSON result');
  const usage = result.usage;
  if (!usage || !nonnegative(usage.input_tokens) || !nonnegative(usage.output_tokens)) throw new Error('Claude returned no valid token usage');
  const metrics = { input: usage.input_tokens, output: usage.output_tokens,
    cacheCreate: usage.cache_creation_input_tokens ?? 0, cacheRead: usage.cache_read_input_tokens ?? 0, cacheReadTokens: usage.cache_read_input_tokens ?? 0,
    turns: Number.isSafeInteger(result.num_turns) && result.num_turns >= 0 ? result.num_turns : null,
    costUsd: result.total_cost_usd, apiDurationMs: result.duration_api_ms ?? null,
    claudeDurationMs: result.duration_ms ?? null };
  if (![metrics.cacheCreate, metrics.cacheRead, metrics.costUsd].every(nonnegative)) throw new Error('Claude returned invalid usage or cost');
  return { ...metrics, freshTokens: freshTokens(metrics), isError: Boolean(result.is_error),
    transcript: typeof result.result === 'string' ? result.result : JSON.stringify(result.result ?? '') };
}
export function summarize(runs) {
  const passing = runs.filter((run) => run.ok);
  if (!passing.length) return null;
  return Object.fromEntries(['input', 'output', 'cacheCreate', 'cacheRead', 'freshTokens', 'marginalFreshTokens', 'floorFreshTokens', 'cacheReadTokens', 'turns', 'costUsd', 'durationMs', 'apiDurationMs', 'claudeDurationMs']
    .map((key) => [key, median(passing.map((run) => run[key]).filter(nonnegative))]));
}
export function redact(value, env = process.env) {
  const secrets = Object.entries(env).filter(([key, val]) => /SECRET|TOKEN|PASSWORD|API_KEY|CREDENTIAL/i.test(key) && typeof val === 'string' && val.length)
    .flatMap(([, val]) => [val, JSON.stringify(val).slice(1, -1), encodeURIComponent(val)])
    .sort((a, b) => b.length - a.length);
  const clean = (value) => {
    if (typeof value === 'string') {
      for (const secret of secrets) value = value.split(secret).join('[REDACTED]');
      return value;
    }
    if (Array.isArray(value)) return value.map(clean);
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, val]) => [key, clean(val)]));
    return value;
  };
  const cleaned = clean(value);
  return typeof value === 'string' ? cleaned : JSON.stringify(cleaned);
}
export function validateScenario(value) {
  if (!value || !['simple', 'hard'].includes(value.id) || value.expectedSteps !== (value.id === 'simple' ? 5 : 12)
    || typeof value.prompt !== 'string' || !['{{skill}}', '{{url}}', '{{project}}', '{{exports}}'].every((key) => value.prompt.includes(key))
    || !['marginalFreshTokens', 'costUsd', 'cacheReadTokens', 'turns', 'durationMs'].every((key) => nonnegative(value.budget?.[key]))
    || (value.baseline !== null && !['freshTokens', 'cacheReadTokens', 'costUsd', 'durationMs'].every((key) => nonnegative(value.baseline?.[key])))) {
    throw new Error('Invalid benchmark scenario');
  }
  return value;
}
