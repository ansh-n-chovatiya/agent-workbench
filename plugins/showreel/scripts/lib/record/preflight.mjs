import { validateScenario } from '../scenario.mjs';

export function pendingSecrets(scenario, env) {
  return scenario.steps.filter((step) => step.actions.some((action) =>
    action.type === 'fill' && action.sensitive === true
    && !env['SHOWREEL_SECRET_' + step.id.toUpperCase()]));
}

export function checkDisk(freeBytes, expectedMinutes, scale) {
  for (const [name, value] of Object.entries({ freeBytes, expectedMinutes, scale })) {
    if (!Number.isFinite(value) || value < 0 || (name === 'scale' && value === 0)) {
      throw new Error(`${name} must be a finite ${name === 'scale' ? 'positive' : 'non-negative'} number`);
    }
  }
  // Worst-case encoded size: the encoder's bitrate is 6 bits per pixel per second at 1080p scaled by scale squared, capped at 60 Mbit/s
  // (see the plan), plus 50% headroom. This is H.264 on disk, not raw frames, so it is a few MB per second.
  const bitsPerSecond = Math.min(60e6, 1920 * 1080 * 6 * scale ** 2);
  const needBytes = Math.round(expectedMinutes * 60 * (bitsPerSecond / 8) * 1.5);
  return { ok: freeBytes >= Math.max(2 * 1024 ** 3, needBytes), needBytes };
}

export function checkScenario(scenario) {
  const result = validateScenario(scenario);
  if (!result.ok) throw new Error(result.errors.join('; '));
  return scenario.steps;
}
