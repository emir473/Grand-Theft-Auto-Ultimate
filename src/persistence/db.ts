/**
 * IndexedDB Persistence Layer with Schema Versioning, Migrations, Validation & Safe Transactions
 */

export const DB_NAME = 'GTAVI_Leonida_DB';
export const DB_VERSION = 2;
export const SAVE_STORE = 'saves';
export const META_STORE = 'meta';

export interface SaveEnvelope {
  slotId: string;
  schemaVersion: number;
  savedAtMs: number;
  checksum: string;
  payload: Record<string, unknown>;
}

function computeChecksum(raw: string): string {
  let hash = 2166136261;
  for (let i = 0; i < raw.length; i++) {
    hash ^= raw.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export class LeonidaDatabase {
  private db: IDBDatabase | null = null;

  async open(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    if (typeof indexedDB === 'undefined') {
      throw new Error('IndexedDB unavailable in this runtime environment.');
    }

    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = (event) => {
        const db = req.result;
        const oldVersion = event.oldVersion;

        if (oldVersion < 1) {
          if (!db.objectStoreNames.contains(SAVE_STORE)) {
            const store = db.createObjectStore(SAVE_STORE, { keyPath: 'slotId' });
            store.createIndex('savedAtMs', 'savedAtMs', { unique: false });
          }
        }
        if (oldVersion < 2) {
          if (!db.objectStoreNames.contains(META_STORE)) {
            db.createObjectStore(META_STORE, { keyPath: 'key' });
          }
        }
      };

      req.onsuccess = () => {
        this.db = req.result;
        this.db.onversionchange = () => {
          this.db?.close();
          this.db = null;
        };
        resolve(this.db);
      };

      req.onerror = () => {
        reject(req.error ?? new Error('Failed to open IndexedDB'));
      };

      req.onblocked = () => {
        reject(new Error('IndexedDB open blocked by another tab'));
      };
    });
  }

  async writeSave(slotId: string, payload: Record<string, unknown>): Promise<SaveEnvelope> {
    if (!slotId || typeof slotId !== 'string') {
      throw new Error('Invalid save slotId');
    }
    const db = await this.open();
    const serialized = JSON.stringify(payload);
    const envelope: SaveEnvelope = {
      slotId,
      schemaVersion: DB_VERSION,
      savedAtMs: Date.now(),
      checksum: computeChecksum(serialized),
      payload,
    };

    return new Promise((resolve, reject) => {
      let settled = false;
      const tx = db.transaction([SAVE_STORE, META_STORE], 'readwrite');
      const store = tx.objectStore(SAVE_STORE);
      const meta = tx.objectStore(META_STORE);

      store.put(envelope);
      meta.put({ key: 'lastSlotId', value: slotId, updatedAt: envelope.savedAtMs });

      tx.oncomplete = () => {
        if (!settled) {
          settled = true;
          resolve(envelope);
        }
      };
      tx.onabort = () => {
        if (!settled) {
          settled = true;
          reject(tx.error ?? new Error('IndexedDB save transaction aborted'));
        }
      };
      tx.onerror = () => {
        if (!settled) {
          settled = true;
          reject(tx.error ?? new Error('IndexedDB save transaction failed'));
        }
      };
    });
  }

  async readSave(slotId: string): Promise<SaveEnvelope | null> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([SAVE_STORE], 'readonly');
      const req = tx.objectStore(SAVE_STORE).get(slotId);

      req.onsuccess = () => {
        const record = req.result as SaveEnvelope | undefined;
        if (!record) {
          resolve(null);
          return;
        }
        try {
          const check = computeChecksum(JSON.stringify(record.payload));
          if (check !== record.checksum) {
            reject(new Error('Save integrity checksum mismatch'));
            return;
          }
          resolve(this.migrateEnvelope(record));
        } catch (err) {
          reject(err);
        }
      };
      req.onerror = () => reject(req.error ?? new Error('Failed to read save'));
      tx.onabort = () => reject(tx.error ?? new Error('Read transaction aborted'));
    });
  }

  private migrateEnvelope(env: SaveEnvelope): SaveEnvelope {
    if (env.schemaVersion < 2) {
      env.schemaVersion = 2;
    }
    return env;
  }

  async deleteSave(slotId: string): Promise<void> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([SAVE_STORE], 'readwrite');
      tx.objectStore(SAVE_STORE).delete(slotId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Delete failed'));
      tx.onabort = () => reject(tx.error ?? new Error('Delete aborted'));
    });
  }

  close(): void {
    this.db?.close();
    this.db = null;
  }
}
