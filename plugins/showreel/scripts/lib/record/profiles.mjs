// Fixed emulation identity; sharpness is controlled by capture scale, never DPR.
export const MOBILE_SAFARI_USER_AGENT = 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1';
export function recordingProfile(config, profile = 'desktop') {
  if (!['desktop', 'phone'].includes(profile)) throw new Error('profile must be desktop or phone');
  return { ...config, profile, viewport: config.viewports?.[profile]
    ?? (profile === 'phone' ? { width: 390, height: 844 } : config.viewport) };
}
export function profileContext(profile) {
  return profile === 'phone' ? { isMobile: true, hasTouch: true, userAgent: MOBILE_SAFARI_USER_AGENT } : {};
}
