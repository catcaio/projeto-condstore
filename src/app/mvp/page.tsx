import { notFound } from 'next/navigation';
import { MVP_FLAGS } from '@/mvp/config/flags';
import { LandingSection } from '@/mvp/site/LandingSection';

/**
 * Entry point for the /mvp route.
 *
 * Gated by NEXT_PUBLIC_ENABLE_MVP=true. When the flag is off the page
 * returns a 404 so it is completely invisible to end users and search engines.
 *
 * This route is intentionally excluded from the Edge middleware matcher, so
 * it is treated as a public page — no auth headers are injected here.
 * Authenticated sub-surfaces live under /mvp/app once the matcher is extended.
 */
export default function MvpPage() {
  if (!MVP_FLAGS.enabled) {
    notFound();
  }

  return <LandingSection />;
}
