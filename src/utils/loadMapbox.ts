import { trackEvent } from './telemetry';

let mapboxLoadPromise: Promise<any> | null = null;
let mapboxLoadError: Error | null = null;

const MAPBOX_JS_URL = 'https://api.mapbox.com/mapbox-gl-js/v3.17.0/mapbox-gl.js';
const MAPBOX_CSS_URL = 'https://api.mapbox.com/mapbox-gl-js/v3.17.0/mapbox-gl.css';
const MAPBOX_LOAD_TIMEOUT_MS = 10000;

function ensureStylesheet(): void {
  const existing = document.querySelector(`link[data-mapbox-css="${MAPBOX_CSS_URL}"]`);
  if (existing) return;

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = MAPBOX_CSS_URL;
  link.setAttribute('data-mapbox-css', MAPBOX_CSS_URL);
  document.head.appendChild(link);
}

function loadScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-mapbox-js="${MAPBOX_JS_URL}"]`) as HTMLScriptElement | null;
    if (existing) {
      if ((window as any).mapboxgl) {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Failed to load Mapbox script')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = MAPBOX_JS_URL;
    script.async = true;
    script.defer = true;
    script.setAttribute('data-mapbox-js', MAPBOX_JS_URL);
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Mapbox script'));
    document.head.appendChild(script);
  });
}

export async function loadMapboxGl(): Promise<any> {
  if (typeof window === 'undefined') {
    throw new Error('Mapbox requires a browser environment');
  }

  if (mapboxLoadError) {
    throw mapboxLoadError;
  }

  if ((window as any).mapboxgl) {
    return (window as any).mapboxgl;
  }

  if (!mapboxLoadPromise) {
    mapboxLoadPromise = (async () => {
      const startedAt = Date.now();
      trackEvent('mapbox_load_start');
      ensureStylesheet();
      await Promise.race([
        loadScript(),
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Mapbox CDN load timed out')), MAPBOX_LOAD_TIMEOUT_MS);
        }),
      ]);
      const mapboxgl = (window as any).mapboxgl;
      if (!mapboxgl) {
        throw new Error('Mapbox loaded but mapboxgl global is missing');
      }
      trackEvent('mapbox_load_success', { durationMs: Date.now() - startedAt });
      return mapboxgl;
    })().catch((error) => {
      mapboxLoadError = error instanceof Error ? error : new Error('Failed to initialize Mapbox');
      trackEvent('mapbox_load_error', { message: mapboxLoadError.message });
      throw mapboxLoadError;
    });
  }

  return mapboxLoadPromise;
}

export function resetMapboxLoader(): void {
  mapboxLoadPromise = null;
  mapboxLoadError = null;
}
