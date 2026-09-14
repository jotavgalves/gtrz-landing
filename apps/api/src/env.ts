export interface Env {
  DB: D1Database;
  MEDIA: R2Bucket;
  ANALYTICS: AnalyticsEngineDataset;
  APP_ENV: string;
  CORS_ALLOWED_ORIGINS: string;
  ADMIN_PASSWORD?: string;
  SESSION_SECRET?: string;
  TURNSTILE_SECRET_KEY?: string;
}
