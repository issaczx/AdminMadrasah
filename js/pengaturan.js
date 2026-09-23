/**
 * pengaturan.js
 * Modul pengaturan komprehensif: Profil Madrasah, Kepala Madrasah, Profil Guru,
 * Tahun Pelajaran & Semester, Keamanan Akun, Backup/Restore Database,
 * Integrasi GitHub Repository REST API, dan Audit Log Aktivitas.
 */

const Pengaturan = {
  settings: {},

  init() {
    this.loadData();
    this.bindEvents();
    this.renderLogs();
  },

  loadData() {
    this.settings = window.Storage.getAll('madrasah') || {};
    const currentUser = window.Auth.getCurrentUser() || {};
    const madrasah = this.settings.madrasah || {};
    const kamad = this.settings.kepala_madrasah || {};

    // 1. Profil Madrasah
    document.getElementById('setMadrasahNama').value = madrasah.nama || '';
    document.getElementById('setMadrasahAlamat').value = madrasah.alamat || '';
    document.getElementById('setMadrasahTelp').value = madrasah.telp || '';
    document.getElementById('setMadrasahEmail').value = madrasah.email || '';
    document.getElementById('setMadrasahKota').value = madrasah.kota || '';
    document.getElementById('setMadrasahNsm').value = madrasah.nsm || '';
    document.getElementById('setMadrasahNpsn').value = madrasah.npsn || '';
    document.getElementById('setMadrasahLogo').value = madrasah.logo || '';

    // 2. Profil Kepala Madrasah
    document.getElementById('setKamadNama').value = kamad.nama || '';
    document.getElementById('setKamadNip').value = kamad.nip || '';
    document.getElementById('setKamadGolongan').value = kamad.pangkat_golongan || '';
    document.getElementById('setKamadJabatan').value = kamad.jabatan || 'Kepala Madrasah';

    // 3. Periode & KKTP
    document.getElementById('setTahunPelajaran').value = this.settings.tahun_pelajaran || '2025/2026';
    document.getElementById('setSemester').value = this.settings.semester || 'Ganjil';
    document.getElementById('setKktpDefault').value = this.settings.kktp_default || 75;

    // 4. Profil User Saat Ini
    document.getElementById('setGuruNama').value = currentUser.nama || '';
    document.getElementById('setGuruUsername').value = currentUser.username || '';
    document.getElementById('setGuruEmail').value = currentUser.email || '';
    document.getElementById('setGuruNip').value = currentUser.nip || '';
    document.getElementById('setGuruGolongan').value = currentUser.pangkat_golongan || '';
    document.getElementById('setGuruMapel').value = currentUser.mata_pelajaran || '';
    document.getElementById('setGuruJabatan').value = currentUser.jabatan || '';

    // 5. GitHub Backend Config
    const gitCfg = window.GitHubAPI ? window.GitHubAPI.getConfig() : {};
    document.getElementById('gitOwner').value = gitCfg.owner || '';
    document.getElementById('gitRepo').value = gitCfg.repo || '';
    document.getElementById('gitBranch').value = gitCfg.branch || 'main';
    document.getElementById('gitToken').value = gitCfg.token || '';
    
    if (gitCfg.last_sync) {
      document.getElementById('gitLastSyncText').innerText = `Terakhir disinkronkan: ${new Date(gitCfg.last_sync).toLocaleString('id-ID')}`;
    }
  },

  bindEvents() {
    // Form Profil Madrasah
    document.getElementById('formMadrasahProfile')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveMadrasahProfile();
    });

    // Form Profil Guru Saat Ini
    document.getElementById('formGuruProfile')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveGuruProfile();
    });

    // Form Ganti Password
    document.getElementById('formChangePassword')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.changePassword();
    });

    // Form GitHub Backend
    document.getElementById('formGithubConfig')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveGithubConfig();
    });

    // Test GitHub Connection
    document.getElementById('btnTestGithubConn')?.addEventListener('click', () => {
      this.testGithub();
    });

    // Sync All to GitHub
    document.getElementById('btnSyncToGithub')?.addEventListener('click', () => {
      this.syncToGithub();
    });

    // Sync All from GitHub
    document.getElementById('btnSyncFromGithub')?.addEventListener('click', () => {
      this.syncFromGithub();
    });

    // Backup Export JSON
    document.getElementById('btnExportBackupJSON')?.addEventListener('click', () => {
      this.exportBackup();
    });

    // Restore Backup JSON
    document.getElementById('inputRestoreJSON')?.addEventListener('change', (e) => {
      this.handleRestoreBackup(e);
    });

    // Clear Logs
    document.getElementById('btnClearLogs')?.addEventListener('click', () => {
      this.clearLogs();
    });
  },

  saveMadrasahProfile() {
    const madrasah = {
      nama: document.getElementById('setMadrasahNama').value.trim(),
      alamat: document.getElementById('setMadrasahAlamat').value.trim(),
      telp: document.getElementById('setMadrasahTelp').value.trim(),
      email: document.getElementById('setMadrasahEmail').value.trim(),
      kota: document.getElementById('setMadrasahKota').value.trim(),
      nsm: document.getElementById('setMadrasahNsm').value.trim(),
      npsn: document.getElementById('setMadrasahNpsn').value.trim(),
      logo: document.getElementById('setMadrasahLogo').value.trim()
    };

    const kepala_madrasah = {
      nama: document.getElementById('setKamadNama').value.trim(),
      nip: document.getElementById('setKamadNip').value.trim(),
      pangkat_golongan: document.getElementById('setKamadGolongan').value.trim(),
      jabatan: document.getElementById('setKamadJabatan').value.trim()
    };

    const tahun_pelajaran = document.getElementById('setTahunPelajaran').value.trim();
    const semester = document.getElementById('setSemester').value;
    const kktp_default = parseFloat(document.getElementById('setKktpDefault').value) || 75;

    const updated = {
      ...this.settings,
      madrasah,
      kepala_madrasah,
      tahun_pelajaran,
      semester,
      kktp_default
    };

    window.Storage.setAll('madrasah', updated);
    window.Storage.logActivity('Memperbarui profil madrasah & tahun pelajaran aktif');
    window.App.showToast('Profil madrasah & periode berhasil diperbarui!', 'success');
    window.App.renderTopbar('pengaturan');
  },

  saveGuruProfile() {
    const currentUser = window.Auth.getCurrentUser();
    if (!currentUser) return;

    const nama = document.getElementById('setGuruNama').value.trim();
    const email = document.getElementById('setGuruEmail').value.trim().toLowerCase();
    const nip = document.getElementById('setGuruNip').value.trim();
    const pangkat_golongan = document.getElementById('setGuruGolongan').value.trim();
    const mata_pelajaran = document.getElementById('setGuruMapel').value.trim();
    const jabatan = document.getElementById('setGuruJabatan').value.trim();

    if (!nama || !email) {
      window.App.showToast('Nama dan Email wajib diisi!', 'warning');
      return;
    }

    const updatedUser = window.Storage.update('user', currentUser.id, {
      nama, email, nip, pangkat_golongan, mata_pelajaran, jabatan
    }, `User ${currentUser.username} memperbarui profil akun`);

    window.Auth.setCurrentUser(updatedUser);
    window.App.currentUser = updatedUser;
    window.App.showToast('Profil akun Anda berhasil diperbarui.', 'success');
    window.App.renderSidebar('pengaturan');
    window.App.renderTopbar('pengaturan');
  },

  async changePassword() {
    const currentUser = window.Auth.getCurrentUser();
    if (!currentUser) return;

    const oldPass = document.getElementById('oldPassword').value;
    const newPass = document.getElementById('newPassword').value;
    const confirmPass = document.getElementById('confirmNewPassword').value;

    if (newPass !== confirmPass) {
      window.App.showToast('Konfirmasi kata sandi baru tidak sesuai!', 'warning');
      return;
    }

    const allUsers = window.Storage.getAll('user') || [];
    const userInDb = allUsers.find(u => u.id === currentUser.id);

    if (!userInDb) {
      window.App.showToast('Data akun tidak ditemukan.', 'danger');
      return;
    }

    const oldHash = await window.Auth.hashPassword(oldPass);
    if (userInDb.passwordHash !== oldHash && userInDb.password !== oldPass) {
      window.App.showToast('Kata sandi lama Anda salah!', 'danger');
      return;
    }

    const newHash = await window.Auth.hashPassword(newPass);
    window.Storage.update('user', currentUser.id, {
      passwordHash: newHash,
      password: null
    }, `User ${currentUser.username} mengubah kata sandi`);

    window.App.showToast('Kata sandi Anda berhasil diperbarui!', 'success');
    document.getElementById('formChangePassword').reset();
  },

  saveGithubConfig() {
    const cfg = {
      owner: document.getElementById('gitOwner').value.trim(),
      repo: document.getElementById('gitRepo').value.trim(),
      branch: document.getElementById('gitBranch').value.trim() || 'main',
      token: document.getElementById('gitToken').value.trim(),
      is_connected: false,
      last_sync: window.GitHubAPI.getConfig().last_sync || null
    };

    window.GitHubAPI.saveConfig(cfg);
    window.App.showToast('Konfigurasi GitHub backend berhasil disimpan.');
  },

  async testGithub() {
    const btn = document.getElementById('btnTestGithubConn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Menguji Koneksi...';

    try {
      this.saveGithubConfig();
      const repo = await window.GitHubAPI.testConnection();
      window.App.showToast(`Berhasil terhubung ke repository "${repo.full_name}"!`, 'success');
      document.getElementById('gitLastSyncText').innerText = `Terhubung (Akses Read/Write Valid)`;
    } catch (err) {
      window.App.showToast(err.message || 'Koneksi GitHub gagal.', 'danger');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-broadcast me-1"></i> Uji Koneksi GitHub';
    }
  },

  async syncToGithub() {
    const btn = document.getElementById('btnSyncToGithub');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Mengunggah ke GitHub...';

    try {
      await window.Storage.syncAllToGitHub();
      window.App.showToast('Seluruh file data JSON berhasil disinkronkan ke GitHub!', 'success');
      document.getElementById('gitLastSyncText').innerText = `Terakhir disinkronkan: ${new Date().toLocaleString('id-ID')}`;
    } catch (err) {
      window.App.showToast(err.message || 'Gagal sinkronisasi ke GitHub.', 'danger');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-cloud-arrow-up me-1"></i> Sinkronkan Semua ke GitHub';
    }
  },

  async syncFromGithub() {
    window.App.confirmModal(
      'Tarik Data dari GitHub',
      'Data di browser akan ditimpa dengan data terbaru dari repository GitHub. Lanjutkan?',
      async () => {
        try {
          await window.Storage.syncAllFromGitHub();
          window.App.showToast('Data berhasil diperbarui dari GitHub!', 'success');
          setTimeout(() => window.location.reload(), 1000);
        } catch (err) {
          window.App.showToast('Gagal menarik data: ' + err.message, 'danger');
        }
      },
      'Ya, Tarik Data',
      'btn-primary'
    );
  },

  exportBackup() {
    const backupJson = window.Storage.exportBackupJSON();
    const blob = new Blob([backupJson], { type: 'application/json;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `backup_madrasah_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    window.App.showToast('File backup database JSON berhasil diunduh.');
  },

  handleRestoreBackup(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        window.Storage.importBackupJSON(content);
        window.App.showToast('Database berhasil dipulihkan dari file backup!', 'success');
        setTimeout(() => window.location.reload(), 1200);
      } catch (err) {
        window.App.showToast('Gagal restore database: ' + err.message, 'danger');
      } finally {
        event.target.value = '';
      }
    };
    reader.readAsText(file);
  },

  renderLogs() {
    const tbody = document.getElementById('tableLogsBody');
    if (!tbody) return;

    const logs = window.Storage.getAll('log') || [];
    if (logs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-4">Belum ada riwayat aktivitas.</td></tr>`;
      return;
    }

    tbody.innerHTML = logs.map((l, idx) => `
      <tr>
        <td class="text-center text-muted small">${idx + 1}</td>
        <td style="white-space: nowrap;"><small class="text-muted">${window.App.formatDate(l.waktu)} ${new Date(l.waktu).toLocaleTimeString('id-ID')}</small></td>
        <td><span class="badge bg-light text-dark border"><i class="bi bi-person me-1"></i>${l.user_nama || 'System'}</span></td>
        <td><div class="small text-dark">${l.aksi}</div></td>
      </tr>
    `).join('');
  },

  clearLogs() {
    window.App.confirmModal(
      'Bersihkan Log Aktivitas',
      'Apakah Anda yakin ingin menghapus seluruh riwayat aktivitas sistem?',
      () => {
        window.Storage.setAll('log', []);
        window.App.showToast('Riwayat log berhasil dikosongkan.');
        this.renderLogs();
      }
    );
  }
};

window.Pengaturan = Pengaturan;
