import { defineMiddleware } from 'astro:middleware';

const eventPathPattern = /^\/eventos\/([^/]+)\/?$/;
const spanishEventPathPattern = /^\/es\/eventos\/([^/]+)\/?$/;

export const onRequest = defineMiddleware((context, next) => {
  const url = context.url;
  const spanishMatch = url.pathname.match(spanishEventPathPattern);

  if (spanishMatch) {
    const target = new URL(url);
    target.pathname = `/eventos/${spanishMatch[1]}`;
    target.searchParams.set('lang', 'es');
    return next(target);
  }

  const eventMatch = url.pathname.match(eventPathPattern);
  if (eventMatch && url.searchParams.has('lang')) {
    const language = url.searchParams.get('lang');
    const clean = new URL(url);
    clean.searchParams.delete('lang');

    if (language === 'es') {
      clean.pathname = `/es/eventos/${eventMatch[1]}`;
    } else {
      clean.pathname = `/eventos/${eventMatch[1]}`;
    }

    return Response.redirect(clean, 308);
  }

  return next();
});
