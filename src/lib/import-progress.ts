export const LOADER_STEPS = [
  { at: 10, label: "Reading CSV" },
  { at: 25, label: "Detecting Columns" },
  { at: 40, label: "Sending AI Batch 1" },
  { at: 55, label: "Sending AI Batch 2" },
  { at: 70, label: "Extracting CRM Fields" },
  { at: 85, label: "Validating Records" },
  { at: 95, label: "Finalizing Import" },
  { at: 100, label: "Completed" },
] as const;

export type LoaderStatus = (typeof LOADER_STEPS)[number]["label"];

const BOX_THRESHOLDS = [12, 24, 36, 48, 60, 72, 84, 95] as const;

export function clampProgress(value: number): number {
  return Math.min(100, Math.max(0, value));
}

export function getBoxPhase(
  progress: number,
  index: number
): "hidden" | "flying" | "landed" {
  const p = clampProgress(progress);
  const start = index === 0 ? 0 : BOX_THRESHOLDS[index - 1];
  const end = BOX_THRESHOLDS[index];

  if (p <= start && index > 0) return "hidden";
  if (p < end) return "flying";
  return "landed";
}

export function getStatusForProgress(progress: number): LoaderStatus {
  const clamped = clampProgress(progress);
  let status: LoaderStatus = LOADER_STEPS[0].label;
  for (const step of LOADER_STEPS) {
    if (clamped >= step.at) status = step.label;
  }
  return status;
}

export function getVisibleBoxCount(progress: number): number {
  const clamped = clampProgress(progress);
  let count = 0;
  for (const threshold of BOX_THRESHOLDS) {
    if (clamped >= threshold) count += 1;
  }
  return count;
}

export function isBoxArriving(progress: number, index: number): boolean {
  return getBoxPhase(progress, index) === "flying";
}

export function isLoaderComplete(progress: number): boolean {
  return clampProgress(progress) >= 100;
}

export type ProgressCallback = (progress: number, status: LoaderStatus) => void;
