/**
 * Browser-side layout audit for EARTH LENS compact UI.
 * Paste this module into DevTools or evaluate it with browser automation.
 * It is a QA helper and is intentionally not included in the production bundle.
 */
export function auditMobileLayout(documentRoot = document, sampleStep = 8) {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  let samples = 0;
  let canvasSamples = 0;
  for (let y = sampleStep / 2; y < viewportHeight; y += sampleStep) {
    for (let x = sampleStep / 2; x < viewportWidth; x += sampleStep) {
      samples += 1;
      const element = documentRoot.elementFromPoint(x, y);
      if (element instanceof HTMLCanvasElement || element?.closest(".earth-globe")) canvasSamples += 1;
    }
  }
  const targets = [...documentRoot.querySelectorAll("button, a")].filter((element) => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return style.visibility !== "hidden" && style.display !== "none" && rect.width > 0 && rect.height > 0;
  }).map((element) => {
    const rect = element.getBoundingClientRect();
    return {
      label: element.getAttribute("aria-label") || element.textContent?.trim().replace(/\s+/g, " ").slice(0, 48) || element.tagName,
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      fontSize: Number.parseFloat(getComputedStyle(element).fontSize),
    };
  });
  return {
    viewport: `${viewportWidth}×${viewportHeight}`,
    globeVisiblePercent: Math.round((canvasSamples / Math.max(samples, 1)) * 1000) / 10,
    targetCount: targets.length,
    undersizedTargets: targets.filter((target) => target.width < 44 || target.height < 44),
    targetsBelow10px: targets.filter((target) => target.fontSize < 10),
  };
}
