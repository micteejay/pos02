
# Production Standards Implementation Plan

## Phase 1: Performance & Loading Speed
- **Code splitting**: Add `React.lazy()` + `Suspense` for all route pages
- **Image optimization**: Add lazy loading to all images
- **Bundle optimization**: Verify tree-shaking, minimize re-renders with `useMemo`/`useCallback` where needed

## Phase 2: Mobile Responsive Polish
- Audit all pages at 360px, 768px, 1024px, 1920px breakpoints
- Fix any overflow/layout issues on mobile
- Ensure touch targets are ≥44px

## Phase 3: PWA (Installable Web App)
- Add `manifest.json` with proper icons, theme color, display: standalone
- **No service worker** (simpler approach — installable without offline complexity)
- Add mobile-optimized meta tags to `index.html`
- Create `/install` page with install prompt

## Phase 4: Capacitor (Native Mobile Prep)
- Install Capacitor dependencies
- Configure `capacitor.config.ts` with app ID and live-reload URL
- Provide user instructions for building iOS/Android

## Phase 5: Security Hardening
- Run security scan and fix findings
- Add input validation with Zod on key forms
- Ensure all RLS policies are company-scoped
- Add rate limiting awareness on edge functions

## Phase 6: Error Handling & Reliability
- Add global error boundary component
- Add retry logic on failed Supabase queries (React Query already handles this)
- Add toast notifications for all error states
- Graceful loading/empty states

## Phase 7: SEO & Accessibility
- Add proper `<title>`, meta description, Open Graph tags
- Semantic HTML audit (headings, landmarks, alt text)
- Add `aria-label` to interactive elements
- JSON-LD structured data for the app
- Viewport meta tag optimization

## Implementation Order
Phases 1, 5, 6, 7 first (code-only), then Phase 3 (PWA), then Phase 4 (Capacitor), with Phase 2 woven throughout.
