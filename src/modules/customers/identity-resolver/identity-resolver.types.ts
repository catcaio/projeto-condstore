export interface IdentityResolutionResult {
    contactId: string;
    customerId: string | null;
    organizationId: string | null;
    confidenceScore: number;
}
