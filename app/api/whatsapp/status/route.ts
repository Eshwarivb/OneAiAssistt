import { NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/tenant';
import { getTenantPrisma } from '@/lib/db/index';
import { decrypt } from '@/lib/encryption';
import { sessions } from '@/whatsapp-engine/engine-logic';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const queryTenantId = url.searchParams.get('tenantId');
    let tenantId = queryTenantId;
    if (!tenantId) {
      try {
        const ctx = await getTenantContext();
        tenantId = ctx.tenantId;
      } catch {
        // No tenant context available
      }
    }

    if (!tenantId) {
      return NextResponse.json({ status: 'DISCONNECTED' });
    }

    // If running with a dedicated WhatsApp engine service, proxy to it
    if (process.env.WHATSAPP_ENGINE_URL) {
      const res = await fetch(`${process.env.WHATSAPP_ENGINE_URL}/api/whatsapp/status?tenantId=${tenantId}`);
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    }

    const db = getTenantPrisma(tenantId, 'ADMIN');

    const session = await db.whatsAppNumber.findUnique({
      where: { tenantId },
    });

    if (!session) {
      return NextResponse.json({ status: 'DISCONNECTED' });
    }

    let phone = null;
    if (session.phoneNumber) {
      try {
        phone = decrypt(session.phoneNumber);
      } catch {
        phone = session.phoneNumber;
      }
    }

    const isConnected = session.status === 'CONNECTED' && (session.provider === 'META_CLOUD_API' || sessions.has(tenantId));

    return NextResponse.json({
      status: isConnected ? 'CONNECTED' : (session.provider === 'META_CLOUD_API' ? session.status : (sessions.has(tenantId) ? 'CONNECTED' : 'DISCONNECTED')),
      phoneNumber: phone,
    });
  } catch {
    return NextResponse.json({ status: 'DISCONNECTED' });
  }
}
