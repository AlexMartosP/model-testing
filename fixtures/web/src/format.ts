/** Display helpers. Pure, so they are the easy thing to unit test. */

export function formatStarted(iso: string, now: Date = new Date()): string {
  const started = new Date(iso);
  const minutes = Math.round((now.getTime() - started.getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.round(hours / 24)} d ago`;
}

export function formatPeak(peakDb: number | null): string {
  return peakDb === null ? "—" : `${peakDb} dB`;
}

export const kindLabel = { noise: "Noise", occupancy: "Occupancy", offline: "Device offline" };
