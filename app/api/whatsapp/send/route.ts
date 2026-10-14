import { NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/tenant';
import { MessageService } from '@/whatsapp-engine/MessageService';
import { getSocketIO } from '@/lib/socket-server';
import { sessions } from '@/whatsapp-engine/engine-logic';

export async function POST(req: Request) {
  try {
    const { tenantId } = await getTenantContext();

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context is missing.' }, { status: 401 });
    }

    const { to, text, mediaId, mimeType, clientMessageId, conversationId } = await req.json();

    if (!to || !conversationId) {
      return NextResponse.json({ error: 'Missing recipient or conversationId.' }, { status: 400 });
    }

    // If running with a dedicated WhatsApp engine service, proxy to it
    if (process.env.WHATSAPP_ENGINE_URL) {
      const res = await fetch(`${process.env.WHATSAPP_ENGINE_URL}/api/whatsapp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, to, text, mediaId, mimeType, clientMessageId, conversationId }),
      });
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    }

    if (!sessions.has(tenantId)) {
      return NextResponse.json({ error: 'WhatsApp session is not active for this tenant.' }, { status: 400 });
    }

    const io = getSocketIO();
    const result = await MessageService.sendMessage(
      tenantId,
      { to, text, mediaId, mimeType, clientMessageId, conversationId },
      io
    );

    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to send message.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
