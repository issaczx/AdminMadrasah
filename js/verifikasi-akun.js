/**
 * verifikasi-akun.js
 * Modul khusus Administrator untuk verifikasi akun pendaftaran guru baru,
 * aktivasi/nonaktivasi akun, selection data massal, CRUD data user guru manual.
 */

const VerifikasiAkun = {
  filterStatus: 'all', // 'all' | 'menunggu_verifikasi' | 'terverifikasi' | 'nonaktif'
  searchQuery: '',
  selectedUserIds: new Set(),

  init() {
    this.bindEvents();
    this.renderTable();
  },

  bindEvents() {
    // Filter status buttons
    document.querySelectorAll('.user-filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.user-filter-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.filterStatus = e.target.getAttribute('data-status');
        this.clearUserSelection();
        this.renderTable();
      });
    });

    // Search query
    document.getElementById('searchUser')?.addEventListener('input', (e) => {
      this.searchQuery = e.target.value.toLowerCase();
      this.clearUserSelection();
      this.renderTable();
    });

    // Selection Data Events
    document.getElementById('selectAllUser')?.addEventListener('change', (e) => {
      this.toggleSelectAllUser(e.target.checked);
    });

    document.getElementById('btnClearSelectionUser')?.addEventListener('click', () => {
      this.clearUserSelection();
    });

    document.getElementById('btnApproveSelectedUser')?.addEventListener('click', () => {
      this.bulkApproveUser();
    });

    document.getElementById('btnDeactivateSelectedUser')?.addEventListener('click', () => {
      this.bulkDeactivateUser();
    });

    document.getElementById('btnDeleteSelectedUser')?.addEventListener('click', () => {
      this.bulkDeleteUser();
    });

    // Form Submit
    document.getElementById('formUserModal')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveUser();
    });
  },

  // -------------------------------------------------------------
  // SELECTION DATA & BULK ACTIONS
  // -------------------------------------------------------------
  toggleSelectUser(id, checked) {
    if (checked) {
      this.selectedUserIds.add(id);
    } else {
      this.selectedUserIds.delete(id);
    }
    this.updateUserSelectionUI();
  },

  toggleSelectAllUser(checked) {
    const visibleUsers = this.getFilteredUserList();
    const currentUser = window.Auth.getCurrentUser() || {};
    if (checked) {
      visibleUsers.forEach(u => {
        if (u.id !== currentUser.id) {
          this.selectedUserIds.add(u.id);
        }
      });
    } else {
      this.selectedUserIds.clear();
    }
    this.updateUserSelectionUI();
    this.renderTable();
  },

  clearUserSelection() {
    this.selectedUserIds.clear();
    this.updateUserSelectionUI();
    const selectAllBox = document.getElementById('selectAllUser');
    if (selectAllBox) {
      selectAllBox.checked = false;
      selectAllBox.indeterminate = false;
    }
    document.querySelectorAll('#tableUserBody tr').forEach(tr => tr.classList.remove('row-selected'));
    document.querySelectorAll('#tableUserBody .row-checkbox-user').forEach(cb => { cb.checked = false; });
  },

  updateUserSelectionUI() {
    const bar = document.getElementById('selectionBarUser');
    const badge = document.getElementById('selectedUserCount');
    const selectAllBox = document.getElementById('selectAllUser');
    const count = this.selectedUserIds.size;
    const visibleUsers = this.getFilteredUserList();
    const currentUser = window.Auth.getCurrentUser() || {};
    const selectableCount = visibleUsers.filter(u => u.id !== currentUser.id).length;

    if (count > 0) {
      bar?.classList.remove('d-none');
      if (badge) badge.innerText = `${count} Dipilih`;
    } else {
      bar?.classList.add('d-none');
    }

    if (selectAllBox && selectableCount > 0) {
      if (count === 0) {
        selectAllBox.checked = false;
        selectAllBox.indeterminate = false;
      } else if (count === selectableCount) {
        selectAllBox.checked = true;
        selectAllBox.indeterminate = false;
      } else {
        selectAllBox.checked = false;
        selectAllBox.indeterminate = true;
      }
    }
  },

  bulkApproveUser() {
    const count = this.selectedUserIds.size;
    if (count === 0) return;

    let allUsers = window.Storage.getAll('user') || [];
    allUsers = allUsers.map(u => {
      if (this.selectedUserIds.has(u.id)) {
        return { ...u, status: 'terverifikasi', updatedAt: new Date().toISOString() };
      }
      return u;
    });

    window.Storage.setAll('user', allUsers);
    window.Storage.logActivity(`Menyetujui & memverifikasi massal ${count} akun guru`);
    window.App.showToast(`Berhasil menyetujui ${count} akun guru terpilih!`, 'success');

    this.clearUserSelection();
    this.renderTable();
    window.App.renderSidebar('verifikasi');
  },

  bulkDeactivateUser() {
    const count = this.selectedUserIds.size;
    if (count === 0) return;

    window.App.confirmModal(
      'Nonaktifkan Massal Akun',
      `Apakah Anda yakin ingin menonaktifkan ${count} akun guru terpilih?`,
      () => {
        let allUsers = window.Storage.getAll('user') || [];
        allUsers = allUsers.map(u => {
          if (this.selectedUserIds.has(u.id)) {
            return { ...u, status: 'nonaktif', updatedAt: new Date().toISOString() };
          }
          return u;
        });

        window.Storage.setAll('user', allUsers);
        window.Storage.logActivity(`Menonaktifkan massal ${count} akun guru`);
        window.App.showToast(`Berhasil menonaktifkan ${count} akun guru.`);

        this.clearUserSelection();
        this.renderTable();
        window.App.renderSidebar('verifikasi');
      }
    );
  },

  bulkDeleteUser() {
    const count = this.selectedUserIds.size;
    if (count === 0) return;

    window.App.confirmModal(
      'Hapus Massal Akun Guru',
      `Apakah Anda yakin ingin menghapus ${count} akun guru terpilih secara permanen?`,
      () => {
        let allUsers = window.Storage.getAll('user') || [];
        allUsers = allUsers.filter(u => !this.selectedUserIds.has(u.id));
        window.Storage.setAll('user', allUsers);
        window.Storage.logActivity(`Menghapus massal ${count} akun guru`);
        window.App.showToast(`Berhasil menghapus ${count} akun guru.`);

        this.clearUserSelection();
        this.renderTable();
        window.App.renderSidebar('verifikasi');
      }
    );
  },

  // -------------------------------------------------------------
  // USER TABLE QUERY & RENDER
  // -------------------------------------------------------------
  getFilteredUserList() {
    let users = window.Storage.getAll('user') || [];

    if (this.filterStatus !== 'all') {
      users = users.filter(u => u.status === this.filterStatus);
    }

    if (this.searchQuery) {
      users = users.filter(u => 
        (u.nama && u.nama.toLowerCase().includes(this.searchQuery)) ||
        (u.email && u.email.toLowerCase().includes(this.searchQuery)) ||
        (u.username && u.username.toLowerCase().includes(this.searchQuery)) ||
        (u.mata_pelajaran && u.mata_pelajaran.toLowerCase().includes(this.searchQuery))
      );
    }

    return users;
  },

  renderTable() {
    const tbody = document.getElementById('tableUserBody');
    if (!tbody) return;

    const users = this.getFilteredUserList();
    const currentUser = window.Auth.getCurrentUser() || {};

    const allUsers = window.Storage.getAll('user') || [];
    const pendingCount = allUsers.filter(u => u.status === 'menunggu_verifikasi').length;
    const verifiedCount = allUsers.filter(u => u.status === 'terverifikasi').length;

    document.getElementById('badgePendingCount').innerText = `${pendingCount} Menunggu`;
    document.getElementById('badgeVerifiedCount').innerText = `${verifiedCount} Terverifikasi`;

    if (users.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-4">Tidak ada data pengguna sesuai filter.</td></tr>`;
      return;
    }

    tbody.innerHTML = users.map((u, idx) => {
      const isSelected = this.selectedUserIds.has(u.id);
      const isSelf = u.id === currentUser.id;

      let statusBadge = '';
      if (u.status === 'menunggu_verifikasi') {
        statusBadge = `<span class="badge bg-warning text-dark"><i class="bi bi-hourglass-split me-1"></i>Menunggu Verifikasi</span>`;
      } else if (u.status === 'terverifikasi') {
        statusBadge = `<span class="badge bg-emerald-soft text-success"><i class="bi bi-check-circle-fill me-1"></i>Terverifikasi</span>`;
      } else {
        statusBadge = `<span class="badge bg-secondary"><i class="bi bi-slash-circle me-1"></i>Nonaktif</span>`;
      }

      return `
        <tr class="${isSelected ? 'row-selected' : ''}">
          <td class="td-select">
            ${!isSelf ? `
              <input type="checkbox" class="form-check-input form-check-input-custom row-checkbox-user" data-id="${u.id}" ${isSelected ? 'checked' : ''}>
            ` : '<span class="text-muted small">-</span>'}
          </td>
          <td class="text-center fw-bold text-muted">${idx + 1}</td>
          <td>
            <div class="fw-bold text-dark">${u.nama} ${isSelf ? '<span class="badge bg-info text-white ms-1">Anda</span>' : ''}</div>
            <small class="text-muted">Username: <b>${u.username || '-'}</b> | NIP: ${u.nip || '-'}</small>
          </td>
          <td>
            <div>${u.email}</div>
            <small class="text-muted">${u.pangkat_golongan || '-'}</small>
          </td>
          <td>
            <div class="fw-semibold text-secondary">${u.mata_pelajaran || '-'}</div>
            <small class="text-muted">${u.jabatan || 'Guru'}</small>
          </td>
          <td>
            <span class="badge ${u.role === 'admin' ? 'bg-primary' : 'bg-light text-dark border'}">${(u.role || 'guru').toUpperCase()}</span>
          </td>
          <td class="text-center">${statusBadge}</td>
          <td class="text-end" style="white-space: nowrap;">
            ${u.status === 'menunggu_verifikasi' ? `
              <button class="btn btn-sm btn-success me-1 px-2" onclick="VerifikasiAkun.approveUser('${u.id}', '${u.nama}')" title="Setujui & Aktifkan Akun">
                <i class="bi bi-check-lg me-1"></i> Setujui
              </button>
            ` : ''}

            ${u.status === 'terverifikasi' && !isSelf ? `
              <button class="btn btn-sm btn-outline-warning me-1" onclick="VerifikasiAkun.deactivateUser('${u.id}', '${u.nama}')" title="Nonaktifkan Akun">
                <i class="bi bi-pause-circle"></i>
              </button>
            ` : ''}

            ${u.status === 'nonaktif' ? `
              <button class="btn btn-sm btn-outline-success me-1" onclick="VerifikasiAkun.approveUser('${u.id}', '${u.nama}')" title="Aktifkan Kembali">
                <i class="bi bi-play-circle"></i>
              </button>
            ` : ''}

            <button class="btn btn-sm btn-outline-primary me-1" onclick="VerifikasiAkun.openEditModal('${u.id}')" title="Edit Data Guru">
              <i class="bi bi-pencil-square"></i>
            </button>

            ${!isSelf ? `
              <button class="btn btn-sm btn-outline-danger" onclick="VerifikasiAkun.deleteUser('${u.id}', '${u.nama}')" title="Hapus Akun">
                <i class="bi bi-trash"></i>
              </button>
            ` : ''}
          </td>
        </tr>
      `;
    }).join('');

    // Attach row checkbox listeners
    tbody.querySelectorAll('.row-checkbox-user').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const id = e.target.getAttribute('data-id');
        this.toggleSelectUser(id, e.target.checked);
        const tr = e.target.closest('tr');
        if (e.target.checked) tr?.classList.add('row-selected');
        else tr?.classList.remove('row-selected');
      });
    });

    this.updateUserSelectionUI();
  },

  async approveUser(id, nama) {
    window.Storage.update('user', id, { status: 'terverifikasi' }, `Menyetujui & memverifikasi akun guru: ${nama}`);
    window.App.showToast(`Akun ${nama} berhasil disetujui dan kini dapat login!`, 'success');
    this.renderTable();
    window.App.renderSidebar('verifikasi');
  },

  async deactivateUser(id, nama) {
    window.App.confirmModal(
      'Nonaktifkan Akun Guru',
      `Apakah Anda yakin ingin menonaktifkan akun "${nama}"? Akun ini tidak akan dapat login sampai diaktifkan kembali.`,
      () => {
        window.Storage.update('user', id, { status: 'nonaktif' }, `Menonaktifkan akun guru: ${nama}`);
        window.App.showToast(`Akun ${nama} dinonaktifkan.`);
        this.renderTable();
        window.App.renderSidebar('verifikasi');
      }
    );
  },

  openAddModal() {
    document.getElementById('formUserModal').reset();
    document.getElementById('editUserId').value = '';
    document.getElementById('userPasswordContainer').style.display = 'block';
    document.getElementById('userPasswordInput').setAttribute('required', 'required');
    document.getElementById('modalUserTitle').innerText = 'Tambah Data Guru Manual';
    new bootstrap.Modal(document.getElementById('modalUser')).show();
  },

  openEditModal(id) {
    const u = window.Storage.getById('user', id);
    if (!u) return;

    document.getElementById('editUserId').value = u.id;
    document.getElementById('userNamaInput').value = u.nama || '';
    document.getElementById('userUsernameInput').value = u.username || '';
    document.getElementById('userEmailInput').value = u.email || '';
    document.getElementById('userNipInput').value = u.nip || '';
    document.getElementById('userPangkatInput').value = u.pangkat_golongan || '';
    document.getElementById('userMapelInput').value = u.mata_pelajaran || '';
    document.getElementById('userJabatanInput').value = u.jabatan || '';
    document.getElementById('userRoleInput').value = u.role || 'guru';
    document.getElementById('userStatusInput').value = u.status || 'terverifikasi';

    // Sembunyikan field password saat edit
    document.getElementById('userPasswordContainer').style.display = 'none';
    document.getElementById('userPasswordInput').removeAttribute('required');

    document.getElementById('modalUserTitle').innerText = 'Edit Data Akun Guru';
    new bootstrap.Modal(document.getElementById('modalUser')).show();
  },

  saveUser() {
    const id = document.getElementById('editUserId').value;
    const nama = document.getElementById('userNamaInput').value.trim();
    const username = document.getElementById('userUsernameInput').value.trim().toLowerCase();
    const email = document.getElementById('userEmailInput').value.trim().toLowerCase();
    const nip = document.getElementById('userNipInput').value.trim();
    const pangkat_golongan = document.getElementById('userPangkatInput').value.trim();
    const mata_pelajaran = document.getElementById('userMapelInput').value.trim();
    const jabatan = document.getElementById('userJabatanInput').value.trim();
    const role = document.getElementById('userRoleInput').value;
    const status = document.getElementById('userStatusInput').value;

    if (!nama || !username || !email) {
      window.App.showToast('Nama, Username, dan Email wajib diisi!', 'warning');
      return;
    }

    const allUsers = window.Storage.getAll('user') || [];

    if (id) {
      const isUsernameTaken = allUsers.some(u => u.id !== id && u.username === username);
      const isEmailTaken = allUsers.some(u => u.id !== id && u.email === email);

      if (isUsernameTaken || isEmailTaken) {
        window.App.showToast('Username atau Email sudah digunakan pengguna lain!', 'danger');
        return;
      }

      window.Storage.update('user', id, {
        nama, username, email, nip, pangkat_golongan, mata_pelajaran, jabatan, role, status
      }, `Memperbarui data akun pengguna ${nama}`);

      window.App.showToast('Data guru berhasil diperbarui.');
    } else {
      const isTaken = allUsers.some(u => u.username === username || u.email === email);
      if (isTaken) {
        window.App.showToast('Username atau Email sudah terdaftar!', 'danger');
        return;
      }

      const password = document.getElementById('userPasswordInput').value;
      if (!password || password.length < 6) {
        window.App.showToast('Password minimal 6 karakter!', 'warning');
        return;
      }

      window.Storage.insert('user', {
        nama,
        username,
        email,
        password_hash: window.Auth.hashPassword(password),
        nip,
        pangkat_golongan,
        mata_pelajaran,
        jabatan,
        role,
        status
      }, `Menambahkan akun guru manual (${nama})`);

      window.App.showToast(`Akun guru ${nama} berhasil ditambahkan.`);
    }

    bootstrap.Modal.getInstance(document.getElementById('modalUser'))?.hide();
    this.renderTable();
    window.App.renderSidebar('verifikasi');
  },

  deleteUser(id, nama) {
    window.App.confirmModal(
      'Hapus Akun Pengguna',
      `Apakah Anda yakin ingin menghapus akun guru "${nama}"? Data login guru ini akan dihapus secara permanen.`,
      () => {
        window.Storage.delete('user', id, `Menghapus akun guru: ${nama}`);
        this.selectedUserIds.delete(id);
        this.updateUserSelectionUI();
        window.App.showToast(`Akun ${nama} berhasil dihapus.`);
        this.renderTable();
        window.App.renderSidebar('verifikasi');
      }
    );
  }
};

window.VerifikasiAkun = VerifikasiAkun;
