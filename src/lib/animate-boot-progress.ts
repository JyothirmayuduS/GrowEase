export const BOOT_LOADER_STEPS = [
  { at: 15, label: "Initializing GrowEasy" },
  { at: 40, label: "Loading CRM Modules" },
  { at: 70, label: "Preparing Import Tools" },
  { at: 100, label: "Ready" },
] as const;

export type BootLoaderStatus = (typeof BOOT_LOADER_STEPS)[number]["label"];

export const BOOT_LOADER_DURATION_MS = 4_500;

function clampProgress(value: number): number {
  return Math.min(100, Math.max(0, value));
}

export function getBootStatusForProgress(progress: number): BootLoaderStatus {
  const clamped = clampProgress(progress);
  let status: BootLoaderStatus = BOOT_LOADER_STEPS[0].label;
  for (const step of BOOT_LOADER_STEPS) {
    if (clamped >= step.at) status = step.label;
  }
  return status;
}

export function animateBootProgress(
  onUpdate: (percent: number, status: string) => void,
  durationMs = BOOT_LOADER_DURATION_MS
): Promise<void> {
  return new Promise((resolve) => {
    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(elapsed / durationMs, 1);
      const eased = 1 - (1 - t) ** 2;
      const percent = eased * 100;

      onUpdate(percent, getBootStatusForProgress(percent));

      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        resolve();
      }
    };

    requestAnimationFrame(tick);
  });
}
