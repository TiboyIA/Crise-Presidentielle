export function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

export function gaugeColor(value: number): "danger" | "warning" | "success" {
  if (value <= 25) return "danger";
  if (value <= 50) return "warning";
  return "success";
}
