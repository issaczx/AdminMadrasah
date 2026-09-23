/**
 * storage.js
 * Manajemen penyimpanan terpadu: LocalStorage Cache + File JSON Seeding + GitHub API Sync
 */

const DB_PREFIX = 'madrasah_db_';
const ENTITIES = ['user', 'kelas', 'murid', 'kehadiran', 'jurnal', 'nilai', 'madrasah', 'log'];

const Storage = {
  async init() {
    for (const entity of ENTITIES) {
      const localData = localStorage.getItem(DB_PREFIX + entity);
      if (!localData) {
        try {
          const res = await fetch(`data/${entity}.json`);
          if (res.ok) {
            const data = await res.json();
            localStorage.setItem(DB_PREFIX + entity, JSON.stringify(data));
          }
        } catch (e) {
          console.warn(`Gagal memuat seed data untuk ${entity}:`, e);
          // Inisialisasi fallback array/objek kosong
          const fallback = (entity === 'madrasah') ? {} : [];
          localStorage.setItem(DB_PREFIX + entity, JSON.stringify(fallback));
        }
      }
    }
  },

  getAll(entity) {
    const raw = localStorage.getItem(DB_PREFIX + entity);
    if (!raw) return (entity === 'madrasah') ? {} : [];
    try {
      return JSON.parse(raw);
    } catch (e) {
      console.error(`Error parse ${entity}:`, e);
      return (entity === 'madrasah') ? {} : [];
    }
  },

  setAll(entity, data, autoSaveGithub = true) {
    localStorage.setItem(DB_PREFIX + entity, JSON.stringify(data));
    
    // Auto sync to GitHub in background if configured
    if (autoSaveGithub && window.GitHubAPI && window.GitHubAPI.isConfigured()) {
      window.GitHubAPI.saveFile(`data/${entity}.json`, data, `Auto-update ${entity} from web`)
        .catch(err => console.warn(`GitHub auto-save failed for ${entity}:`, err));
    }
  },

  getById(entity, id) {
    const items = this.getAll(entity);
    if (!Array.isArray(items)) return null;
    return items.find(item => item.id === id) || null;
  },

  insert(entity, item, userActivityText = null) {
    const items = this.getAll(entity);
    if (!item.id) {
      item.id = entity.slice(0, 3) + '-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
    }
    if (!item.createdAt) {
      item.createdAt = new Date().toISOString();
    }
    items.push(item);
    this.setAll(entity, items);

    if (userActivityText) {
      this.logActivity(userActivityText);
    }
    return item;
  },

  update(entity, id, updatedFields, userActivityText = null) {
    const items = this.getAll(entity);
    if (entity === 'madrasah') {
      const merged = { ...items, ...updatedFields };
      this.setAll(entity, merged);
      if (userActivityText) this.logActivity(userActivityText);
      return merged;
    }

    const index = items.findIndex(item => item.id === id);
    if (index === -1) return null;

    items[index] = { ...items[index], ...updatedFields, updatedAt: new Date().toISOString() };
    this.setAll(entity, items);

    if (userActivityText) {
      this.logActivity(userActivityText);
    }
    return items[index];
  },

  delete(entity, id, userActivityText = null) {
    const items = this.getAll(entity);
    if (!Array.isArray(items)) return false;

    const filtered = items.filter(item => item.id !== id);
    if (filtered.length === items.length) return false;

    this.setAll(entity, filtered);
    if (userActivityText) {
      this.logActivity(userActivityText);
    }
    return true;
  },

  logActivity(aksi) {
    let currentUser = null;
    try {
      const session = localStorage.getItem('madrasah_session');
      if (session) currentUser = JSON.parse(session);
    } catch (e) {}

    const logs = this.getAll('log');
    const newLog = {
      id: 'log-' + Date.now().toString(36),
      user_id: currentUser ? currentUser.id : 'system',
      user_nama: currentUser ? currentUser.nama : 'System',
      aksi: aksi,
      waktu: new Date().toISOString()
    };

    logs.unshift(newLog);
    // Batasi log maksimal 200 entri terbaru
    if (logs.length > 200) logs.pop();
    this.setAll('log', logs, false);
  },

  exportBackupJSON() {
    const backup = {
      app: 'AdminMadrasah',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      data: {}
    };
    for (const entity of ENTITIES) {
      backup.data[entity] = this.getAll(entity);
    }
    return JSON.stringify(backup, null, 2);
  },

  importBackupJSON(jsonString) {
    try {
      const backup = JSON.parse(jsonString);
      if (!backup.data || typeof backup.data !== 'object') {
        throw new Error('Format file backup tidak valid.');
      }
      for (const entity of ENTITIES) {
        if (backup.data[entity]) {
          this.setAll(entity, backup.data[entity]);
        }
      }
      this.logActivity('Memulihkan database dari file backup JSON');
      return true;
    } catch (e) {
      console.error('Import backup failed:', e);
      throw e;
    }
  },

  async syncAllToGitHub() {
    if (!window.GitHubAPI || !window.GitHubAPI.isConfigured()) {
      throw new Error('GitHub API belum dikonfigurasi.');
    }
    const results = [];
    for (const entity of ENTITIES) {
      const data = this.getAll(entity);
      await window.GitHubAPI.saveFile(`data/${entity}.json`, data, `Manual Sync ${entity}`);
      results.push(entity);
    }
    const cfg = window.GitHubAPI.getConfig();
    cfg.last_sync = new Date().toISOString();
    window.GitHubAPI.saveConfig(cfg);
    this.logActivity('Sinkronisasi penuh seluruh data ke GitHub Repository');
    return results;
  },

  async syncAllFromGitHub() {
    if (!window.GitHubAPI || !window.GitHubAPI.isConfigured()) {
      throw new Error('GitHub API belum dikonfigurasi.');
    }
    const results = [];
    for (const entity of ENTITIES) {
      const remote = await window.GitHubAPI.getFile(`data/${entity}.json`);
      if (remote && remote.content) {
        this.setAll(entity, remote.content, false);
        results.push(entity);
      }
    }
    const cfg = window.GitHubAPI.getConfig();
    cfg.last_sync = new Date().toISOString();
    window.GitHubAPI.saveConfig(cfg);
    this.logActivity('Sinkronisasi tarik data dari GitHub Repository');
    return results;
  }
};

window.Storage = Storage;
