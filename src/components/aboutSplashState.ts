const ABOUT_SEEN_KEY = "earth-lens-about-seen-v1";

export function shouldShowAboutSplash(): boolean {
  try { return localStorage.getItem(ABOUT_SEEN_KEY) !== "1"; } catch { return true; }
}

export function markAboutSplashSeen(): void {
  try { localStorage.setItem(ABOUT_SEEN_KEY, "1"); } catch { /* private browsing: close for this visit */ }
}
