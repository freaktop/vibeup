import { logger } from './logger';

export interface TelemetryEvent {
  name: string;
  ts: number;
  payload?: Record<string, unknown>;
}

const TELEMETRY_KEY = '@vibeup:telemetry';
const TELEMETRY_LIMIT = 100;

export function trackEvent(name: string, payload?: Record<string, unknown>): void {
  const event: TelemetryEvent = {
    name,
    ts: Date.now(),
    payload,
  };

  try {
    if (typeof window !== 'undefined') {
      const raw = window.localStorage.getItem(TELEMETRY_KEY);
      const existing = raw ? (JSON.parse(raw) as TelemetryEvent[]) : [];
      existing.push(event);
      if (existing.length > TELEMETRY_LIMIT) {
        existing.splice(0, existing.length - TELEMETRY_LIMIT);
      }
      window.localStorage.setItem(TELEMETRY_KEY, JSON.stringify(existing));
      window.dispatchEvent(new CustomEvent('vibeupTelemetry', { detail: event }));
    }
  } catch {
    // keep telemetry non-blocking
  }

  logger.info('[Telemetry]', event.name, event.payload || {});
}

export function readTelemetryEvents(): TelemetryEvent[] {
  try {
    if (typeof window === 'undefined') return [];
    const raw = window.localStorage.getItem(TELEMETRY_KEY);
    return raw ? (JSON.parse(raw) as TelemetryEvent[]) : [];
  } catch {
    return [];
  }
}

export function clearTelemetryEvents(): void {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(TELEMETRY_KEY);
  } catch {
    // no-op
  }
}
