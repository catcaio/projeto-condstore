import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getDb } from '@/infra/db';
import { users } from '@/drizzle/schema';
import { hashPassword } from '@/infra/auth/password';
import { sql, eq } from 'drizzle-orm';
import { logger } from '@/infra/logger';

export async function GET() {
    try {
        const db = await getDb();
        const adminEmail = 'admin@condstore.local';

        // Ensure tenant exists for admin user to link to
        // We'll insert a fallback default tenant if none exists, or fetch the first one.
        let tenantId = 'condstore-admin-tenant';
        const existingTenants = await db.execute(sql`SELECT id FROM tenants LIMIT 1`);

        if (Array.isArray(existingTenants) && existingTenants.length > 0 && Array.isArray(existingTenants[0]) && existingTenants[0].length > 0) {
            tenantId = (existingTenants[0][0] as any).id;
        } else {
            // Insert default tenant if missing
            await db.execute(sql`
                INSERT IGNORE INTO tenants (id, name, twilio_number) 
                VALUES (${tenantId}, 'Condstore Admin', 'whatsapp:+5511999999999')
           `);
        }

        // Check if user exists
        const existingAdmin = await db.select().from(users).where(eq(users.email, adminEmail)).limit(1);

        if (existingAdmin.length === 0) {
            const passwordHash = hashPassword('Condstore@123');

            await db.insert(users).values({
                id: randomUUID(),
                email: adminEmail,
                passwordHash: passwordHash,
                tenantId: tenantId,
                role: 'admin',
            });

            return NextResponse.json({ success: true, message: 'Admin user created successfully.' });
        }

        return NextResponse.json({ success: true, message: 'Admin user already exists.' });
    } catch (error) {
        logger.error('Failed to seed admin', error as Error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
