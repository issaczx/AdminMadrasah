/**
 * github-api.js
 * Modul integrasi GitHub REST API v3 untuk backend data JSON.
 */

const GitHubAPI = {
  getConfig() {
    const raw = localStorage.getItem('madrasah_github_config');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        console.error('Failed to parse github config', e);
      }
    }
    return {
      owner: '',
      repo: '',
      branch: 'main',
      token: '',
      is_connected: false,
      last_sync: null
    };
  },

  saveConfig(config) {
    localStorage.setItem('madrasah_github_config', JSON.stringify(config));
  },

  isConfigured() {
    const cfg = this.getConfig();
    return Boolean(cfg.owner && cfg.repo && cfg.token);
  },

  getHeaders() {
    const cfg = this.getConfig();
    return {
      'Accept': 'application/vnd.github.v3+json',
      'Authorization': `token ${cfg.token}`,
      'Content-Type': 'application/json'
    };
  },

  async testConnection() {
    const cfg = this.getConfig();
    if (!this.isConfigured()) {
      throw new Error('Konfigurasi GitHub belum lengkap (Owner, Repo, dan Token wajib diisi).');
    }

    const url = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}`;
    const response = await fetch(url, { headers: this.getHeaders() });
    
    if (!response.ok) {
      if (response.status === 401) throw new Error('Personal Access Token tidak valid.');
      if (response.status === 404) throw new Error('Repository tidak ditemukan. Pastikan nama owner & repo benar.');
      throw new Error(`Gagal terhubung ke GitHub (${response.status}: ${response.statusText})`);
    }

    const data = await response.json();
    cfg.is_connected = true;
    cfg.last_sync = new Date().toISOString();
    this.saveConfig(cfg);
    return data;
  },

  async getFile(filePath) {
    const cfg = this.getConfig();
    if (!this.isConfigured()) return null;

    const cleanPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
    const url = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${cleanPath}?ref=${cfg.branch || 'main'}&t=${Date.now()}`;
    
    const response = await fetch(url, { headers: this.getHeaders() });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`Gagal membaca file dari GitHub: ${response.statusText}`);

    const fileData = await response.json();
    // GitHub API returns content in base64
    const decodedContent = decodeURIComponent(escape(atob(fileData.content.replace(/\s/g, ''))));
    return {
      sha: fileData.sha,
      content: JSON.parse(decodedContent)
    };
  },

  async saveFile(filePath, contentObj, commitMessage = 'Update data via Web App') {
    const cfg = this.getConfig();
    if (!this.isConfigured()) {
      console.warn('GitHub API not configured, skipping remote save.');
      return false;
    }

    const cleanPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
    const url = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${cleanPath}`;
    
    // First get current SHA if exists
    let sha = null;
    try {
      const existing = await this.getFile(cleanPath);
      if (existing && existing.sha) sha = existing.sha;
    } catch (e) {
      console.warn('File might be new on GitHub:', e);
    }

    const jsonString = JSON.stringify(contentObj, null, 2);
    // Convert utf-8 string to base64
    const base64Content = btoa(unescape(encodeURIComponent(jsonString)));

    const payload = {
      message: commitMessage,
      content: base64Content,
      branch: cfg.branch || 'main'
    };
    if (sha) payload.sha = sha;

    const response = await fetch(url, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(`Gagal menyimpan file ke GitHub: ${errJson.message || response.statusText}`);
    }

    return await response.json();
  }
};

window.GitHubAPI = GitHubAPI;
