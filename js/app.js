/**
 * app.js
 * Modul UI global, template generator (Sidebar, Topbar, Modals, Toast),
 * utilitas export/import CSV, dan helper format.
 */

const App = {
  currentUser: null,
  settings: {},

  async init(pageId = '', allowedRoles = []) {
    // Inisialisasi Storage lokal
    await window.Storage.init();

    // Verifikasi Autentikasi
    this.currentUser = window.Auth.requireAuth(allowedRoles);
    if (!this.currentUser && !window.location.pathname.endsWith('index.html') && !window.location.pathname.endsWith('/')) {
      return;
    }

    this.settings = window.Storage.getAll('madrasah') || {};

    // Render komponen UI jika ada container
    this.renderSidebar(pageId);
    this.renderTopbar(pageId);
    this.initToastContainer();
    this.initMobileSidebarToggle();
  },

  renderSidebar(activePage) {
    const sidebarContainer = document.getElementById('sidebar-container');
    if (!sidebarContainer) return;

    const user = this.currentUser || {};
    const isAdmin = user.role === 'admin';

    // Hitung jumlah guru pending untuk badge admin
    let pendingBadge = '';
    if (isAdmin) {
      const users = window.Storage.getAll('user') || [];
      const pendingCount = users.filter(u => u.status === 'menunggu_verifikasi').length;
      if (pendingCount > 0) {
        pendingBadge = `<span class="badge bg-warning text-dark ms-auto">${pendingCount}</span>`;
      }
    }

    const html = `
      <div class="sidebar-brand">
        <div class="sidebar-brand-icon">
          <i class="bi bi-mortarboard-fill"></i>
        </div>
        <div class="sidebar-brand-text">
          <h6>Admin Madrasah</h6>
          <small>${this.settings.madrasah?.nama || 'SIM Administrasi'}</small>
        </div>
      </div>

      <div class="sidebar-menu">
        <div class="menu-section-title">Menu Utama</div>
        
        <a href="dashboard.html" class="nav-link-custom ${activePage === 'dashboard' ? 'active' : ''}">
          <i class="bi bi-grid-1x2-fill"></i>
          <span>Dasbor</span>
        </a>

        <a href="data-master.html" class="nav-link-custom ${activePage === 'data-master' ? 'active' : ''}">
          <i class="bi bi-people-fill"></i>
          <span>Data Master Murid</span>
        </a>

        <a href="kehadiran.html" class="nav-link-custom ${activePage === 'kehadiran' ? 'active' : ''}">
          <i class="bi bi-calendar-check-fill"></i>
          <span>Kehadiran Murid</span>
        </a>

        <a href="jurnal.html" class="nav-link-custom ${activePage === 'jurnal' ? 'active' : ''}">
          <i class="bi bi-journal-bookmark-fill"></i>
          <span>Jurnal Guru Harian</span>
        </a>

        <a href="nilai.html" class="nav-link-custom ${activePage === 'nilai' ? 'active' : ''}">
          <i class="bi bi-award-fill"></i>
          <span>Rekap Nilai Sumatif</span>
        </a>

        <a href="laporan.html" class="nav-link-custom ${activePage === 'laporan' ? 'active' : ''}">
          <i class="bi bi-printer-fill"></i>
          <span>Cetak Laporan</span>
        </a>

        ${isAdmin ? `
          <div class="menu-section-title">Administrasi Sistem</div>
          <a href="verifikasi-akun.html" class="nav-link-custom ${activePage === 'verifikasi' ? 'active' : ''}">
            <i class="bi bi-person-check-fill"></i>
            <span>Verifikasi Guru</span>
            ${pendingBadge}
          </a>
        ` : ''}

        <div class="menu-section-title">Preferensi</div>
        <a href="pengaturan.html" class="nav-link-custom ${activePage === 'pengaturan' ? 'active' : ''}">
          <i class="bi bi-gear-fill"></i>
          <span>Pengaturan</span>
        </a>
      </div>

      <div class="sidebar-footer">
        <div class="d-flex align-items-center justify-content-between">
          <div class="d-flex align-items-center gap-2">
            <div class="user-avatar" style="width: 32px; height: 32px; font-size: 0.75rem;">
              ${(user.nama || 'U').charAt(0).toUpperCase()}
            </div>
            <div style="line-height: 1.2;">
              <div class="text-white fw-bold" style="font-size: 0.8rem; max-width: 130px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                ${user.nama || 'Pengguna'}
              </div>
              <small class="text-muted" style="font-size: 0.7rem; text-transform: capitalize;">${user.role || 'Guru'}</small>
            </div>
          </div>
          <button class="btn btn-sm btn-outline-danger p-1" style="line-height: 1;" onclick="window.Auth.logout()" title="Keluar">
            <i class="bi bi-box-arrow-right"></i>
          </button>
        </div>
      </div>
    `;

    sidebarContainer.innerHTML = html;
  },

  renderTopbar(pageId) {
    const topbarContainer = document.getElementById('topbar-container');
    if (!topbarContainer) return;

    const user = this.currentUser || {};
    const titles = {
      'dashboard': 'Dasbor Administrasi',
      'data-master': 'Data Master Kelas & Murid',
      'kehadiran': 'Rekapitulasi Kehadiran Murid',
      'jurnal': 'Jurnal Pembelajaran Harian',
      'nilai': 'Rekap & Analisis Nilai Sumatif',
      'laporan': 'Pusat Cetak Laporan Resmi',
      'verifikasi': 'Verifikasi & Manajemen Akun Guru',
      'pengaturan': 'Pengaturan Sistem & Profil'
    };

    const currentTitle = titles[pageId] || 'Aplikasi Administrasi Guru';
    const thn = this.settings.tahun_pelajaran || '2025/2026';
    const smt = this.settings.semester || 'Ganjil';

    const html = `
      <div class="topbar-left">
        <button class="btn btn-soft d-lg-none p-2" id="sidebarToggleBtn">
          <i class="bi bi-list fs-5"></i>
        </button>
        <div class="topbar-title">
          <h5>${currentTitle}</h5>
          <span>Tahun Pelajaran ${thn} — Semester ${smt}</span>
        </div>
      </div>

      <div class="topbar-right">
        <div class="dropdown">
          <div class="user-badge" data-bs-toggle="dropdown" aria-expanded="false">
            <div class="user-avatar">
              ${(user.nama || 'U').charAt(0).toUpperCase()}
            </div>
            <div class="d-none d-md-block text-start" style="line-height: 1.2;">
              <div class="fw-bold text-dark" style="font-size: 0.85rem;">${user.nama || 'Pengguna'}</div>
              <small class="text-muted" style="font-size: 0.72rem;">${user.role === 'admin' ? 'Administrator' : (user.mata_pelajaran || 'Guru')}</small>
            </div>
            <i class="bi bi-chevron-down text-muted ms-1" style="font-size: 0.75rem;"></i>
          </div>
          <ul class="dropdown-menu dropdown-menu-end shadow border-0 mt-2" style="border-radius: 12px; min-width: 200px;">
            <li class="px-3 py-2 border-bottom">
              <div class="fw-bold">${user.nama}</div>
              <small class="text-muted">${user.email || user.username}</small>
              <div><span class="badge bg-emerald-soft mt-1">${user.role?.toUpperCase()}</span></div>
            </li>
            <li><a class="dropdown-item py-2" href="pengaturan.html"><i class="bi bi-person-gear me-2"></i> Profil & Akun</a></li>
            ${user.role === 'admin' ? `<li><a class="dropdown-item py-2" href="verifikasi-akun.html"><i class="bi bi-shield-check me-2"></i> Kelola User</a></li>` : ''}
            <li><hr class="dropdown-divider"></li>
            <li><a class="dropdown-item py-2 text-danger" href="javascript:void(0)" onclick="window.Auth.logout()"><i class="bi bi-box-arrow-right me-2"></i> Keluar</a></li>
          </ul>
        </div>
      </div>
    `;

    topbarContainer.innerHTML = html;
  },

  initMobileSidebarToggle() {
    document.addEventListener('click', (e) => {
      const toggleBtn = e.target.closest('#sidebarToggleBtn');
      const sidebar = document.getElementById('sidebar-container');
      if (toggleBtn && sidebar) {
        sidebar.classList.toggle('show');
      } else if (!e.target.closest('#sidebar-container') && sidebar && sidebar.classList.contains('show')) {
        sidebar.classList.remove('show');
      }
    });
  },

  initToastContainer() {
    if (!document.getElementById('app-toast-container')) {
      const container = document.createElement('div');
      container.id = 'app-toast-container';
      container.className = 'toast-container position-fixed top-0 end-0 p-3';
      container.style.zIndex = '9999';
      document.body.appendChild(container);
    }
  },

  showToast(message, type = 'success') {
    this.initToastContainer();
    const container = document.getElementById('app-toast-container');
    
    const icons = {
      success: 'bi-check-circle-fill text-success',
      danger: 'bi-exclamation-octagon-fill text-danger',
      warning: 'bi-exclamation-triangle-fill text-warning',
      info: 'bi-info-circle-fill text-info'
    };

    const toastEl = document.createElement('div');
    toastEl.className = 'toast align-items-center border-0 shadow-lg mb-2';
    toastEl.setAttribute('role', 'alert');
    toastEl.setAttribute('aria-live', 'assertive');
    toastEl.setAttribute('aria-atomic', 'true');
    toastEl.style.borderRadius = '12px';
    toastEl.style.background = '#ffffff';

    toastEl.innerHTML = `
      <div class="d-flex p-3 align-items-center">
        <i class="bi ${icons[type] || icons.info} fs-4 me-3"></i>
        <div class="toast-body p-0 flex-grow-1 text-dark" style="font-size: 0.9rem; font-weight: 500;">
          ${message}
        </div>
        <button type="button" class="btn-close ms-2" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
    `;

    container.appendChild(toastEl);
    const toast = new bootstrap.Toast(toastEl, { delay: 4000 });
    toast.show();

    toastEl.addEventListener('hidden.bs.toast', () => {
      toastEl.remove();
    });
  },

  confirmModal(title, message, onConfirm, confirmBtnText = 'Ya, Lanjutkan', confirmBtnClass = 'btn-danger') {
    let modalEl = document.getElementById('global-confirm-modal');
    if (!modalEl) {
      modalEl = document.createElement('div');
      modalEl.id = 'global-confirm-modal';
      modalEl.className = 'modal fade';
      modalEl.setAttribute('tabindex', '-1');
      modalEl.innerHTML = `
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content border-0 shadow-lg" style="border-radius: 16px;">
            <div class="modal-header border-0 pb-0">
              <h5 class="modal-title fw-bold" id="confirmModalTitle"></h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body py-3" id="confirmModalBody" style="font-size: 0.95rem; color: #475569;">
            </div>
            <div class="modal-footer border-0 pt-0">
              <button type="button" class="btn btn-light" data-bs-dismiss="modal">Batal</button>
              <button type="button" class="btn ${confirmBtnClass}" id="confirmModalActionBtn">${confirmBtnText}</button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modalEl);
    }

    document.getElementById('confirmModalTitle').innerText = title;
    document.getElementById('confirmModalBody').innerText = message;
    const actionBtn = document.getElementById('confirmModalActionBtn');
    actionBtn.className = `btn ${confirmBtnClass}`;
    actionBtn.innerText = confirmBtnText;

    const bsModal = new bootstrap.Modal(modalEl);
    
    // Clean old listeners
    const newBtn = actionBtn.cloneNode(true);
    actionBtn.parentNode.replaceChild(newBtn, actionBtn);

    newBtn.addEventListener('click', async () => {
      bsModal.hide();
      if (typeof onConfirm === 'function') {
        await onConfirm();
      }
    });

    bsModal.show();
  },

  // Export CSV Helper
  exportToCSV(filename, headers, rows) {
    const formatValue = (val) => {
      if (val === null || val === undefined) return '""';
      let stringVal = String(val).replace(/"/g, '""');
      return `"${stringVal}"`;
    };

    const csvContent = [
      headers.map(formatValue).join(','),
      ...rows.map(row => row.map(formatValue).join(','))
    ].join('\r\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  // Parse CSV Helper (supports comma and semicolon)
  parseCSV(text) {
    const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length === 0) return { headers: [], data: [] };

    // Determine delimiter (comma or semicolon)
    const delimiter = lines[0].includes(';') ? ';' : ',';

    const parseLine = (line) => {
      const result = [];
      let current = '';
      let insideQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (insideQuotes && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            insideQuotes = !insideQuotes;
          }
        } else if (char === delimiter && !insideQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headers = parseLine(lines[0]);
    const data = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseLine(lines[i]);
      if (values.length > 0 && values.some(v => v !== '')) {
        data.push(values);
      }
    }

    return { headers, data };
  },

  formatDate(dateStr) {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch (e) {
      return dateStr;
    }
  }
};

window.App = App;
