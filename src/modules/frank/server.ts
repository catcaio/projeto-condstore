/**
 * Frank Module — Server Entrypoint.
 *
 * Re-exports server-only symbols for consumers outside the frank module.
 * Use `@/modules/frank/server` to import these.
 */

export { frankService } from './frank.service';
export { ecosystemFeedService } from './services/ecosystem-feed.service';
export type { EcosystemFeedItem, ImpactCategory, SuggestedAction } from './services/ecosystem-feed.service';
