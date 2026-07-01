const GA_ID = 'G-VM7RM4GBJ1';

declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
    dataLayer: unknown[];
  }
}

function isAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.gtag === 'function';
}

/** Fire a page_view hit — call on every React Router location change. */
export function pageview(path: string, title?: string): void {
  if (!isAvailable()) return;
  window.gtag('config', GA_ID, {
    page_path: path,
    page_title: title ?? document.title,
  });
}

/** Fire a named GA4 event with optional parameters. */
export function event(name: string, params?: Record<string, unknown>): void {
  if (!isAvailable()) return;
  window.gtag('event', name, params ?? {});
}
