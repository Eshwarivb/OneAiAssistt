import { initAuthCreds, BufferJSON, makeCacheableSignalKeyStore, proto } from '@whiskeysockets/baileys';
import { getTenantPrisma } from '../lib/db/index';
import { encrypt, decrypt } from '../lib/encryption';
import pino from 'pino';

const silentLogger = pino({ level: 'silent' });
const activeSaveTimers = new Map<string, NodeJS.Timeout>();

/**
 * Custom Baileys authentication state provider that stores credentials in PostgreSQL (Neon)
 * encrypted with AES-256-GCM. Uses RLS-compliant client.
 * Wraps the signal key store with Baileys' official makeCacheableSignalKeyStore to prevent
 * write-then-read races that cause "Closing session" spam and broken message encryption.
 */
export async function getDatabaseAuthState(tenantId: string) {
  const db = getTenantPrisma(tenantId, 'ADMIN');

  // Fetch existing session record
  const session = await db.whatsAppNumber.findUnique({
    where: { tenantId },
  });

  let creds = initAuthCreds();
  let keys: Record<string, any> = {};

  if (session && session.sessionData && session.sessionData.includes(':')) {
    try {
      const decrypted = decrypt(session.sessionData);
      const parsed = JSON.parse(decrypted, BufferJSON.reviver);
      if (parsed && parsed.creds) {
        creds = parsed.creds;
        // Check: If creds has an incomplete pairing code or unauthenticated me.id,
        // it was an aborted or incomplete pairing attempt. Loading it causes Baileys to attempt
        // a bogus login with an unregistered JID, which WhatsApp immediately rejects with 401.
        if (creds.pairingCode && !creds.registered) {
          console.warn(`[Auth State] Cleaning up uncompleted pairing code state for tenant ${tenantId}`);
          creds.me = undefined;
          creds.pairingCode = undefined;
        } else if (creds.me && !creds.account && !creds.registered) {
          console.warn(`[Auth State] Incomplete authentication state (unregistered me) for tenant ${tenantId}, resetting.`);
          creds = initAuthCreds();
          keys = {};
        }
      }
      if (parsed && parsed.keys) keys = parsed.keys;
    } catch (e) {
      console.warn(`[Auth State] Corrupted sessionData for tenant ${tenantId}, resetting.`);
      creds = initAuthCreds();
      keys = {};
    }
  }

  const persistStateNow = async () => {
    const existing = activeSaveTimers.get(tenantId);
    if (existing) {
      clearTimeout(existing);
      activeSaveTimers.delete(tenantId);
    }
    try {
      const serialized = JSON.stringify({ creds, keys }, BufferJSON.replacer);
      const encrypted = encrypt(serialized);
      await db.whatsAppNumber.upsert({
        where: { tenantId },
        create: { tenantId, sessionData: encrypted, status: creds.me ? 'CONNECTED' : 'QR_PENDING' },
        update: { sessionData: encrypted },
      });
      console.log(`[Auth State] Persisted credentials successfully for tenant ${tenantId} (hasMe: ${!!creds.me})`);
    } catch (e) {
      console.error(`[Auth State] Failed to save sessionData for tenant ${tenantId}:`, e);
    }
  };

  const scheduleSaveState = () => {
    const existing = activeSaveTimers.get(tenantId);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(async () => {
      activeSaveTimers.delete(tenantId);
      try {
        const serialized = JSON.stringify({ creds, keys }, BufferJSON.replacer);
        const encrypted = encrypt(serialized);
        await db.whatsAppNumber.upsert({
          where: { tenantId },
          create: { tenantId, sessionData: encrypted, status: creds.me ? 'CONNECTED' : 'QR_PENDING' },
          update: { sessionData: encrypted },
        });
      } catch (e) {
        console.error(`[Auth State] Failed to save sessionData for tenant ${tenantId}:`, e);
      }
    }, 300);
    activeSaveTimers.set(tenantId, timer);
  };

  // Raw key store backed by the in-memory `keys` map
  const rawKeyStore = {
    get: async (type: string, ids: string[]) => {
      const data: Record<string, any> = {};
      for (const id of ids) {
        let val = keys[`${type}:${id}`];
        if (type === 'app-state-sync-key' && val) {
          val = proto.Message.AppStateSyncKeyData.fromObject(val);
        }
        if (val) data[id] = val;
      }
      return data;
    },
    set: async (data: any) => {
      for (const type of Object.keys(data)) {
        for (const id of Object.keys(data[type])) {
          const val = data[type][id];
          if (val) {
            keys[`${type}:${id}`] = val;
          } else {
            delete keys[`${type}:${id}`];
          }
        }
      }
      scheduleSaveState();
    },
  };

  return {
    state: {
      creds,
      // Wrap with official caching layer to prevent Signal key race conditions
      keys: makeCacheableSignalKeyStore(rawKeyStore, silentLogger as any),
    },
    saveCreds: async () => {
      // Save credentials immediately to guarantee persistence before any disconnect/restart
      await persistStateNow();
    },
  };
}

/**
 * Dedicated clear function — wipes all auth data for a tenant.
 * Cancels any pending debounced writes to avoid re-inserting stale/cleared state.
 */
export async function clearDatabaseAuthState(tenantId: string): Promise<void> {
  const existingTimer = activeSaveTimers.get(tenantId);
  if (existingTimer) {
    clearTimeout(existingTimer);
    activeSaveTimers.delete(tenantId);
  }
  const db = getTenantPrisma(tenantId, 'ADMIN');
  await db.whatsAppNumber.upsert({
    where: { tenantId },
    create: { tenantId, sessionData: '', status: 'DISCONNECTED', phoneNumber: null },
    update: { sessionData: '', status: 'DISCONNECTED', phoneNumber: null },
  });
  console.log(`[Auth State] Credentials cleared for tenant ${tenantId}`);
}
