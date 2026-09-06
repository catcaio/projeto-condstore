import { z } from 'zod';
import { getCustomerWithContext } from '@/modules/clientes/customer.repository';
import { executeFrankTool } from '../tool-guard';
import { getRecentOrdersTool, type RecentOrderSummary } from './getRecentOrders.tool';
import { getRecentQuotesTool, type RecentQuoteSummary } from './getRecentQuotes.tool';
import { clampSupportLimit, resolveFrankCustomerReference } from './shared';
import { FrankToolContract } from '../frank-tool.contract';
import { frankToolRegistry } from '../frank-tool.registry';

export interface GetCustomerContextParams {
    tenantId: string;
    customerId?: string | null;
    sessionCustomerId?: string | null;
    phone?: string | null;
    limit?: number;
}

export interface CustomerContextToolResult {
    customer: NonNullable<Awaited<ReturnType<typeof getCustomerWithContext>>>['customer'];
    organization: NonNullable<Awaited<ReturnType<typeof getCustomerWithContext>>>['organization'];
    contacts: NonNullable<Awaited<ReturnType<typeof getCustomerWithContext>>>['contacts'];
    recentOrders: RecentOrderSummary[];
    recentQuotes: RecentQuoteSummary[];
}

export const getCustomerContextInputSchema = z.object({
    tenantId: z.string().min(1, 'tenantId is required'),
    customerId: z.string().nullable().optional(),
    sessionCustomerId: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    limit: z.number().int().positive().optional(),
});

export const getCustomerContextOutputSchema = z.object({
    customer: z.any(),
    organization: z.any(),
    contacts: z.array(z.any()),
    recentOrders: z.array(z.any()),
    recentQuotes: z.array(z.any()),
}).nullable();

export const getCustomerContextContract: FrankToolContract<GetCustomerContextParams, CustomerContextToolResult | null> = {
    name: 'get_customer_context',
    description: 'Resolves customer background, organization, contacts, and recent orders/quotes.',
    inputSchema: getCustomerContextInputSchema,
    outputSchema: getCustomerContextOutputSchema,
    isReadOnly: true,
    riskClass: 'SAFE',
    capabilities: ['READ', 'QUERY', 'SEARCH'],
    sideEffects: ['NONE'],
    execute: async (input) => {
        return getCustomerContextTool(input);
    },
};

frankToolRegistry.registerTool(getCustomerContextContract);

export async function getCustomerContextTool(
    params: GetCustomerContextParams,
): Promise<CustomerContextToolResult | null> {
    return executeFrankTool({
        tenantId: params.tenantId,
        toolName: 'get_customer_context',
        access: 'read_only',
        run: async () => {
            const limit = clampSupportLimit(params.limit);
            const reference = await resolveFrankCustomerReference({
                tenantId: params.tenantId,
                customerId: params.customerId,
                sessionCustomerId: params.sessionCustomerId,
                phone: params.phone,
            });

            if (!reference) {
                return null;
            }

            const customerContext = await getCustomerWithContext(
                params.tenantId,
                reference.customerId,
            );

            if (!customerContext) {
                return null;
            }

            const [recentOrders, recentQuotes] = await Promise.all([
                getRecentOrdersTool({
                    tenantId: params.tenantId,
                    customerId: reference.customerId,
                    limit,
                }),
                getRecentQuotesTool({
                    tenantId: params.tenantId,
                    customerId: reference.customerId,
                    limit,
                }),
            ]);

            return {
                customer: customerContext.customer,
                organization: customerContext.organization,
                contacts: customerContext.contacts,
                recentOrders,
                recentQuotes,
            };
        },
    });
}
