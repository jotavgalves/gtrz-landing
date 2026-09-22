import { Hono } from 'hono';
import type { Env } from '../env';
import { requireAdmin } from '../security';
import { dashboardAdminRoutes } from './admin/dashboard';
import { contentAdminRoutes } from './admin/content';
import { eventsAdminRoutes } from './admin/events';
import { peopleAdminRoutes } from './admin/people';
import { marketingAdminRoutes } from './admin/marketing';
import { feedbackAdminRoutes } from './admin/feedback';

export const adminRoutes = new Hono<{ Bindings: Env }>();

// Authentication lives exclusively under /api/admin/auth.
// Everything mounted here requires an already valid admin session.
adminRoutes.use('*', requireAdmin);
adminRoutes.route('/', dashboardAdminRoutes);
adminRoutes.route('/', contentAdminRoutes);
adminRoutes.route('/', eventsAdminRoutes);
adminRoutes.route('/', peopleAdminRoutes);
adminRoutes.route('/', marketingAdminRoutes);
adminRoutes.route('/', feedbackAdminRoutes);
