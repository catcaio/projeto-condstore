import { NextRequest, NextResponse } from 'next/server';
import { setAdminCookie, clearAdminCookie } from '../../../../lib/admin/auth';

export async function POST(req: NextRequest) {
    try {
        const { secret } = await req.json();

        if (secret === process.env.ADMIN_SECRET) {
            setAdminCookie();
            return NextResponse.json({ ok: true });
        } else {
            clearAdminCookie();
            return NextResponse.json({ ok: false }, { status: 401 });
        }
    } catch (e) {
        return NextResponse.json({ ok: false }, { status: 500 });
    }
}
