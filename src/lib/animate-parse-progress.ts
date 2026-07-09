import { getParseStatusForProgress } from "@/lib/import-progress";

export const PARSE_LOADER_DURATION_MS = 12_000;

export function animateParseProgress(
  onUpdate: (percent: number, status: string) => void,
  durationMs = PARSE_LOADER_DURATION_MS
): Promise<void> {
  return new Promise((resolve) => {
    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(elapsed / durationMs, 1);
      const eased = 1 - (1 - t) ** 2;
      const percent = eased * 100;

      onUpdate(percent, getParseStatusForProgress(percent));

      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        resolve();
      }
    };

    requestAnimationFrame(tick);
  });
}
