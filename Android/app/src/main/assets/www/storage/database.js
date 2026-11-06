/* StudyPilot local database. No network calls are made from this module. */
(() => {
  "use strict";
  const DB_NAME = "StudyPilotLocal";
  const DB_VERSION = 1;
  const STORES = ["settings", "subjects", "quizzes", "attempts", "notes", "sessions", "activity"];
  let dbPromise;

  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      if (!("indexedDB" in window)) return reject(new Error("This browser does not support IndexedDB."));
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        for (const name of STORES) {
          if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: "id" });
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => db.close();
        resolve(db);
      };
      request.onerror = () => reject(request.error || new Error("Could not open local database."));
      request.onblocked = () => reject(new Error("Database upgrade is blocked by another open StudyPilot tab."));
    });
    return dbPromise;
  }

  async function requestResult(req) {
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error("Database request failed."));
    });
  }

  const Store = {
    async get(store, id) {
      const db = await openDB();
      return requestResult(db.transaction(store, "readonly").objectStore(store).get(id));
    },
    async all(store) {
      const db = await openDB();
      return requestResult(db.transaction(store, "readonly").objectStore(store).getAll());
    },
    async put(store, value) {
      const db = await openDB();
      const tx = db.transaction(store, "readwrite");
      tx.objectStore(store).put(value);
      return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve(value);
        tx.onerror = () => reject(tx.error || new Error("Could not save data."));
        tx.onabort = () => reject(tx.error || new Error("Save was cancelled."));
      });
    },
    async remove(store, id) {
      const db = await openDB();
      const tx = db.transaction(store, "readwrite");
      tx.objectStore(store).delete(id);
      return new Promise((resolve, reject) => {
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error || new Error("Could not delete data."));
      });
    },
    async clearAll() {
      const db = await openDB();
      const tx = db.transaction(STORES, "readwrite");
      STORES.forEach(name => tx.objectStore(name).clear());
      return new Promise((resolve, reject) => {
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error || new Error("Could not clear local data."));
      });
    },
    async exportAll() {
      const data = { format: "studypilot-backup", version: 1, exportedAt: new Date().toISOString(), stores: {} };
      for (const name of STORES) data.stores[name] = await this.all(name);
      return data;
    },
    async importAll(data) {
      if (!data || data.format !== "studypilot-backup" || data.version !== 1 || !data.stores || typeof data.stores !== "object") {
        throw new Error("This is not a supported StudyPilot backup.");
      }
      for (const name of STORES) {
        if (!Array.isArray(data.stores[name])) throw new Error("Backup is missing valid " + name + " data.");
        if (data.stores[name].length > 10000) throw new Error("Backup contains too many records.");
        for (const item of data.stores[name]) {
          if (!item || typeof item !== "object" || typeof item.id !== "string" || item.id.length > 120) {
            throw new Error("Backup contains an invalid record.");
          }
        }
      }
      await this.clearAll();
      const db = await openDB();
      for (const name of STORES) {
        if (!data.stores[name].length) continue;
        const tx = db.transaction(name, "readwrite");
        data.stores[name].forEach(item => tx.objectStore(name).put(item));
        await new Promise((resolve, reject) => {
          tx.oncomplete = resolve;
          tx.onerror = () => reject(tx.error || new Error("Could not restore " + name + "."));
        });
      }
    }
  };
  window.StudyStore = Store;
})();