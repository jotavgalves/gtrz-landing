export type Locale = 'pt-BR' | 'es';

export interface CmsSection {
  id: string;
  type: string;
  position: number;
  enabled: number | boolean;
  config_json?: string;
  locale?: string;
  content_json?: string;
}

export interface CmsEvent {
  id: string;
  slug: string;
  status: string;
  city: string;
  state?: string;
  starts_at: string;
  locale?: string;
  title?: string;
  summary?: string;
}

export interface HomePayload {
  page: unknown;
  sections: CmsSection[];
  events: CmsEvent[];
}

const API_BASE = import.meta.env.PUBLIC_API_BASE || '';

export async function getHomePage(): Promise<HomePayload> {
  try {
    const response = await fetch(`${API_BASE}/api/public/site`, { headers: { accept: 'application/json' } });
    if (!response.ok) throw new Error(`CMS ${response.status}`);
    return await response.json();
  } catch {
    return { page: null, sections: [], events: [] };
  }
}

export function pickLocale<T extends { locale?: string }>(rows: T[], locale: Locale) {
  return rows.filter((row) => row.locale === locale || !row.locale);
}

export function parseJson<T>(value: string | undefined, fallback: T): T {
  if (!value) return fallback;
  try { return JSON.parse(value) as T; } catch { return fallback; }
}
