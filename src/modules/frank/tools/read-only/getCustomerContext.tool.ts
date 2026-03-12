import { getCustomerWithContext } from '@/modules/clientes/customer.repository';
import { executeFrankTool } from '../tool-guard';
import { getRecentOrdersTool, type RecentOrderSummary } from './getRecentOrders.tool';
import { getRecentQuotesTool, type RecentQuoteSummary } from './getRecentQuotes.tool';
import { clampSupportLimit, resolveFrankCustomerReference } from './shared';

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
