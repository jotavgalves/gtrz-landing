import { z } from 'zod';

export const localeSchema = z.enum(['pt-BR', 'es']);
export type Locale = z.infer<typeof localeSchema>;

export const eventStatusSchema = z.enum([
  'draft', 'scheduled', 'published', 'sales_open', 'sold_out', 'finished', 'archived'
]);
export type EventStatus = z.infer<typeof eventStatusSchema>;

export const analyticsEventSchema = z.object({
  eventName: z.enum([
    'page_view','section_view','cta_click','event_card_click','ticket_click','popup_view',
    'popup_click','popup_close','instagram_click','whatsapp_click','language_change',
    'scroll_25','scroll_50','scroll_75','scroll_100','freelancer_form_start',
    'freelancer_form_submit','partnership_form_start','partnership_form_submit'
  ]),
  path: z.string().max(500),
  section: z.string().max(120).optional(),
  element: z.string().max(160).optional(),
  eventId: z.string().max(80).optional(),
  language: localeSchema,
  referrer: z.string().max(1000).optional(),
  sessionId: z.string().min(8).max(100),
  utmSource: z.string().max(120).optional(),
  utmMedium: z.string().max(120).optional(),
  utmCampaign: z.string().max(160).optional(),
  utmContent: z.string().max(160).optional(),
  trackingLink: z.string().max(160).optional()
});
export type AnalyticsEvent = z.infer<typeof analyticsEventSchema>;

export const pageSectionSchema = z.object({
  id: z.string(),
  type: z.enum(['hero','about','rhythms','differentials','events','team','freelancers','partnerships','instagram','contact','text','gallery','faq','cta']),
  position: z.number().int().nonnegative(),
  enabled: z.boolean(),
  config: z.record(z.string(), z.unknown()).default({}),
  content: z.record(z.string(), z.unknown()).default({})
});
export type PageSection = z.infer<typeof pageSectionSchema>;
