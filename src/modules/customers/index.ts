/**
 * Customers Bounded Context — Canonical Public API
 *
 * Single source of truth for Customer, CustomerContact, and Organization identity,
 * lifecycle, context resolution, and merge operations.
 */

// Identity & Phone Resolution
export { resolveCustomerByPhone } from './identity-resolver/identity-resolver.service';
export type { IdentityResolutionResult } from './identity-resolver/identity-resolver.types';
export { customerResolutionService } from './customer-resolution.service';

// Organization Management & Merging
export { organizationService, sanitizeCnpj, hashCnpj } from './organization.service';
export type { UpdateCnpjInput, UpdateCnpjResult } from './organization.service';

// Domain Repository & Context Lookup
export {
    getCustomerWithContext,
    findCustomerReferenceByPhone,
    hashPhone,
    phoneLast4,
} from './customer.repository';
