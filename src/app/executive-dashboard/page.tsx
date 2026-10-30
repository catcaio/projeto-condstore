import { redirect } from 'next/navigation';
import { getServerSessionUser } from '@/infra/auth/session';
import { ExecutiveDashboardPage } from '@/modules/executive-dashboard/pages/ExecutiveDashboardPage';

export const dynamic = 'force-dynamic';

/** Local report laboratory; operational reporting lives in the authenticated cockpit. */
export default async function Page() {
  const session = await getServerSessionUser();
  if (!session?.tenantId || !session.sub) redirect('/login');
  if (session.role !== 'admin') redirect('/cockpit/gestao-ecommerce');
  return <ExecutiveDashboardPage key={`${session.tenantId}:${session.sub}`} scope={{ tenantId: session.tenantId, userId: session.sub }} />;
}
