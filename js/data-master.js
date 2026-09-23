/**
 * data-master.js
 * Modul logika pengelolaan Data Master Kelas dan Data Master Murid.
 * Fitur: CRUD Kelas, CRUD Murid, Selection Data Massal, Pindah Kelas Massal, Filter, Sort, Import/Export CSV.
 */

const DataMaster = {
  activeTab: 'murid', // 'murid' | 'kelas'
  muridFilterKelas: 'all',
  muridSearchQuery: '',
  muridSortBy: 'no_absen', // 'no_absen' | 'nama' | 'nis_lokal'
  muridSortAsc: true,

  // Selection Sets
  selectedMuridIds: new Set(),
  selectedKelasIds: new Set(),

  init() {
    this.bindEvents();
    this.renderKelasSelectOptions();
    this.renderMuridTable();
    this.renderKelasTable();
  },

  bindEvents() {
    // Filter & Search Murid
    document.getElementById('filterKelasMurid')?.addEventListener('change', (e) => {
      this.muridFilterKelas = e.target.value;
      this.clearMuridSelection();
      this.renderMuridTable();
    });

    document.getElementById('searchMurid')?.addEventListener('input', (e) => {
      this.muridSearchQuery = e.target.value.toLowerCase();
      this.clearMuridSelection();
      this.renderMuridTable();
    });

    // Murid Selection Events
    document.getElementById('selectAllMurid')?.addEventListener('change', (e) => {
      this.toggleSelectAllMurid(e.target.checked);
    });

    document.getElementById('btnClearSelectionMurid')?.addEventListener('click', () => {
      this.clearMuridSelection();
    });

    document.getElementById('btnDeleteSelectedMurid')?.addEventListener('click', () => {
      this.bulkDeleteMurid();
    });

    document.getElementById('btnExportSelectedMurid')?.addEventListener('click', () => {
      this.bulkExportMurid();
    });

    document.getElementById('btnMoveSelectedMurid')?.addEventListener('click', () => {
      this.openMoveClassModal();
    });

    document.getElementById('btnConfirmPindahKelas')?.addEventListener('click', () => {
      this.confirmMoveClass();
    });

    // Kelas Selection Events
    document.getElementById('selectAllKelas')?.addEventListener('change', (e) => {
      this.toggleSelectAllKelas(e.target.checked);
    });

    document.getElementById('btnClearSelectionKelas')?.addEventListener('click', () => {
      this.clearKelasSelection();
    });

    document.getElementById('btnDeleteSelectedKelas')?.addEventListener('click', () => {
      this.bulkDeleteKelas();
    });

    // Form Tambah / Edit Murid
    document.getElementById('formMurid')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveMurid();
    });

    // Form Tambah / Edit Kelas
    document.getElementById('formKelas')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveKelas();
    });

    // Export CSV Murid
    document.getElementById('btnExportMuridCSV')?.addEventListener('click', () => {
      this.exportMuridCSV();
    });

    // Import CSV Murid
    document.getElementById('inputImportMuridCSV')?.addEventListener('change', (e) => {
      this.handleImportMuridCSV(e);
    });

    // Template CSV Murid
    document.getElementById('btnDownloadTemplateMurid')?.addEventListener('click', () => {
      this.downloadTemplateMurid();
    });

    // Export CSV Kelas
    document.getElementById('btnExportKelasCSV')?.addEventListener('click', () => {
      this.exportKelasCSV();
    });

    // Import CSV Kelas
    document.getElementById('inputImportKelasCSV')?.addEventListener('change', (e) => {
      this.handleImportKelasCSV(e);
    });
  },

  // -------------------------------------------------------------
  // MURID SELECTION & BULK ACTIONS
  // -------------------------------------------------------------
  toggleSelectMurid(id, checked) {
    if (checked) {
      this.selectedMuridIds.add(id);
    } else {
      this.selectedMuridIds.delete(id);
    }
    this.updateMuridSelectionUI();
  },

  toggleSelectAllMurid(checked) {
    const visibleMurids = this.getFilteredMuridList();
    if (checked) {
      visibleMurids.forEach(m => this.selectedMuridIds.add(m.id));
    } else {
      this.selectedMuridIds.clear();
    }
    this.updateMuridSelectionUI();
    this.renderMuridTable();
  },

  clearMuridSelection() {
    this.selectedMuridIds.clear();
    this.updateMuridSelectionUI();
    const selectAllBox = document.getElementById('selectAllMurid');
    if (selectAllBox) {
      selectAllBox.checked = false;
      selectAllBox.indeterminate = false;
    }
    document.querySelectorAll('#tableMuridBody tr').forEach(tr => tr.classList.remove('row-selected'));
    document.querySelectorAll('#tableMuridBody .row-checkbox').forEach(cb => { cb.checked = false; });
  },

  updateMuridSelectionUI() {
    const bar = document.getElementById('selectionBarMurid');
    const badge = document.getElementById('selectedMuridCount');
    const selectAllBox = document.getElementById('selectAllMurid');
    const count = this.selectedMuridIds.size;
    const visibleMurids = this.getFilteredMuridList();

    if (count > 0) {
      bar?.classList.remove('d-none');
      if (badge) badge.innerText = `${count} Siswa Dipilih`;
    } else {
      bar?.classList.add('d-none');
    }

    if (selectAllBox && visibleMurids.length > 0) {
      const visibleSelectedCount = visibleMurids.filter(m => this.selectedMuridIds.has(m.id)).length;
      if (visibleSelectedCount === 0) {
        selectAllBox.checked = false;
        selectAllBox.indeterminate = false;
      } else if (visibleSelectedCount === visibleMurids.length) {
        selectAllBox.checked = true;
        selectAllBox.indeterminate = false;
      } else {
        selectAllBox.checked = false;
        selectAllBox.indeterminate = true;
      }
    }
  },

  bulkDeleteMurid() {
    const count = this.selectedMuridIds.size;
    if (count === 0) return;

    window.App.confirmModal(
      'Hapus Massal Siswa',
      `Apakah Anda yakin ingin menghapus ${count} data siswa terpilih sekaligus?`,
      () => {
        let allMurid = window.Storage.getAll('murid') || [];
        allMurid = allMurid.filter(m => !this.selectedMuridIds.has(m.id));
        window.Storage.setAll('murid', allMurid);
        window.Storage.logActivity(`Menghapus massal ${count} data siswa`);
        window.App.showToast(`Berhasil menghapus ${count} data siswa.`);

        this.clearMuridSelection();
        this.renderMuridTable();
        this.renderKelasTable();
      }
    );
  },

  bulkExportMurid() {
    const count = this.selectedMuridIds.size;
    if (count === 0) return;

    const allMurid = window.Storage.getAll('murid') || [];
    const selected = allMurid.filter(m => this.selectedMuridIds.has(m.id));
    this.exportMuridDataList(selected, `data_siswa_terpilih_${count}`);
    window.App.showToast(`Berhasil mengekspor ${count} siswa terpilih ke CSV.`);
  },

  openMoveClassModal() {
    const count = this.selectedMuridIds.size;
    if (count === 0) return;

    const kelasList = window.Storage.getAll('kelas') || [];
    const select = document.getElementById('selectTargetPindahKelas');
    const desc = document.getElementById('textPindahKelasDesc');

    if (desc) desc.innerText = `Pindahkan ${count} siswa terpilih ke rombongan belajar / kelas baru:`;
    if (select) {
      select.innerHTML = '<option value="">Pilih Kelas Tujuan...</option>' +
        kelasList.map(k => `<option value="${k.id}">Kelas ${k.nama_kelas} (${k.wali_kelas || 'Tanpa Wali'})</option>`).join('');
    }

    new bootstrap.Modal(document.getElementById('modalPindahKelasMassal')).show();
  },

  confirmMoveClass() {
    const targetKelasId = document.getElementById('selectTargetPindahKelas')?.value;
    if (!targetKelasId) {
      window.App.showToast('Silakan pilih kelas tujuan terlebih dahulu!', 'warning');
      return;
    }

    const count = this.selectedMuridIds.size;
    let allMurid = window.Storage.getAll('murid') || [];
    const targetKelas = window.Storage.getById('kelas', targetKelasId);

    allMurid = allMurid.map(m => {
      if (this.selectedMuridIds.has(m.id)) {
        return { ...m, kelas_id: targetKelasId, updatedAt: new Date().toISOString() };
      }
      return m;
    });

    window.Storage.setAll('murid', allMurid);
    window.Storage.logActivity(`Memindahkan massal ${count} siswa ke kelas ${targetKelas ? targetKelas.nama_kelas : targetKelasId}`);
    window.App.showToast(`Berhasil memindahkan ${count} siswa ke kelas ${targetKelas ? targetKelas.nama_kelas : ''}.`);

    bootstrap.Modal.getInstance(document.getElementById('modalPindahKelasMassal'))?.hide();
    this.clearMuridSelection();
    this.renderMuridTable();
    this.renderKelasTable();
  },

  // -------------------------------------------------------------
  // KELAS SELECTION & BULK ACTIONS
  // -------------------------------------------------------------
  toggleSelectKelas(id, checked) {
    if (checked) {
      this.selectedKelasIds.add(id);
    } else {
      this.selectedKelasIds.delete(id);
    }
    this.updateKelasSelectionUI();
  },

  toggleSelectAllKelas(checked) {
    const kelasList = window.Storage.getAll('kelas') || [];
    if (checked) {
      kelasList.forEach(k => this.selectedKelasIds.add(k.id));
    } else {
      this.selectedKelasIds.clear();
    }
    this.updateKelasSelectionUI();
    this.renderKelasTable();
  },

  clearKelasSelection() {
    this.selectedKelasIds.clear();
    this.updateKelasSelectionUI();
    const selectAllBox = document.getElementById('selectAllKelas');
    if (selectAllBox) {
      selectAllBox.checked = false;
      selectAllBox.indeterminate = false;
    }
    document.querySelectorAll('#tableKelasBody tr').forEach(tr => tr.classList.remove('row-selected'));
    document.querySelectorAll('#tableKelasBody .row-checkbox-kelas').forEach(cb => { cb.checked = false; });
  },

  updateKelasSelectionUI() {
    const bar = document.getElementById('selectionBarKelas');
    const badge = document.getElementById('selectedKelasCount');
    const selectAllBox = document.getElementById('selectAllKelas');
    const count = this.selectedKelasIds.size;
    const kelasList = window.Storage.getAll('kelas') || [];

    if (count > 0) {
      bar?.classList.remove('d-none');
      if (badge) badge.innerText = `${count} Kelas Dipilih`;
    } else {
      bar?.classList.add('d-none');
    }

    if (selectAllBox && kelasList.length > 0) {
      if (count === 0) {
        selectAllBox.checked = false;
        selectAllBox.indeterminate = false;
      } else if (count === kelasList.length) {
        selectAllBox.checked = true;
        selectAllBox.indeterminate = false;
      } else {
        selectAllBox.checked = false;
        selectAllBox.indeterminate = true;
      }
    }
  },

  bulkDeleteKelas() {
    const count = this.selectedKelasIds.size;
    if (count === 0) return;

    window.App.confirmModal(
      'Hapus Massal Kelas',
      `Apakah Anda yakin ingin menghapus ${count} kelas terpilih? Siswa di kelas tersebut akan berstatus "Tanpa Kelas".`,
      () => {
        let allKelas = window.Storage.getAll('kelas') || [];
        allKelas = allKelas.filter(k => !this.selectedKelasIds.has(k.id));
        window.Storage.setAll('kelas', allKelas);
        window.Storage.logActivity(`Menghapus massal ${count} data rombel/kelas`);
        window.App.showToast(`Berhasil menghapus ${count} kelas.`);

        this.clearKelasSelection();
        this.renderKelasSelectOptions();
        this.renderKelasTable();
        this.renderMuridTable();
      }
    );
  },

  // -------------------------------------------------------------
  // KELAS LOGIC
  // -------------------------------------------------------------
  renderKelasSelectOptions() {
    const kelasList = window.Storage.getAll('kelas') || [];
    const filterSelect = document.getElementById('filterKelasMurid');
    const formMuridKelasSelect = document.getElementById('muridKelas');

    if (filterSelect) {
      filterSelect.innerHTML = '<option value="all">Semua Kelas</option>' + 
        kelasList.map(k => `<option value="${k.id}">${k.nama_kelas}</option>`).join('');
    }

    if (formMuridKelasSelect) {
      formMuridKelasSelect.innerHTML = '<option value="">Pilih Kelas...</option>' + 
        kelasList.map(k => `<option value="${k.id}">${k.nama_kelas}</option>`).join('');
    }
  },

  renderKelasTable() {
    const tableBody = document.getElementById('tableKelasBody');
    if (!tableBody) return;

    const kelasList = window.Storage.getAll('kelas') || [];
    const murids = window.Storage.getAll('murid') || [];

    if (kelasList.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">Belum ada data kelas.</td></tr>`;
      return;
    }

    tableBody.innerHTML = kelasList.map((k, index) => {
      const isSelected = this.selectedKelasIds.has(k.id);
      const studentCount = murids.filter(m => m.kelas_id === k.id).length;
      return `
        <tr class="${isSelected ? 'row-selected' : ''}">
          <td class="td-select">
            <input type="checkbox" class="form-check-input form-check-input-custom row-checkbox-kelas" data-id="${k.id}" ${isSelected ? 'checked' : ''}>
          </td>
          <td class="text-center fw-bold">${index + 1}</td>
          <td><span class="badge bg-emerald-soft fw-bold fs-6 px-3 py-1">${k.nama_kelas}</span></td>
          <td>Tingkat ${k.tingkat || '-'}</td>
          <td>${k.wali_kelas || '-'}</td>
          <td class="text-center"><span class="badge bg-secondary-light text-dark px-2">${studentCount} Siswa</span></td>
          <td class="text-end">
            <button class="btn btn-sm btn-outline-primary me-1" onclick="DataMaster.openEditKelas('${k.id}')" title="Edit Kelas">
              <i class="bi bi-pencil-square"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger" onclick="DataMaster.deleteKelas('${k.id}', '${k.nama_kelas}')" title="Hapus Kelas">
              <i class="bi bi-trash"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');

    // Attach row checkbox listeners
    tableBody.querySelectorAll('.row-checkbox-kelas').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const id = e.target.getAttribute('data-id');
        this.toggleSelectKelas(id, e.target.checked);
        const tr = e.target.closest('tr');
        if (e.target.checked) tr?.classList.add('row-selected');
        else tr?.classList.remove('row-selected');
      });
    });

    this.updateKelasSelectionUI();
  },

  openAddKelas() {
    document.getElementById('formKelas').reset();
    document.getElementById('kelasId').value = '';
    document.getElementById('modalKelasTitle').innerText = 'Tambah Rombongan Belajar (Kelas)';
    new bootstrap.Modal(document.getElementById('modalKelas')).show();
  },

  openEditKelas(id) {
    const k = window.Storage.getById('kelas', id);
    if (!k) return;

    document.getElementById('kelasId').value = k.id;
    document.getElementById('kelasNama').value = k.nama_kelas;
    document.getElementById('kelasTingkat').value = k.tingkat || '7';
    document.getElementById('kelasWali').value = k.wali_kelas || '';
    document.getElementById('kelasKeterangan').value = k.keterangan || '';
    document.getElementById('modalKelasTitle').innerText = 'Edit Data Kelas';

    new bootstrap.Modal(document.getElementById('modalKelas')).show();
  },

  saveKelas() {
    const id = document.getElementById('kelasId').value;
    const nama_kelas = document.getElementById('kelasNama').value.trim();
    const tingkat = document.getElementById('kelasTingkat').value.trim();
    const wali_kelas = document.getElementById('kelasWali').value.trim();
    const keterangan = document.getElementById('kelasKeterangan').value.trim();

    if (!nama_kelas) {
      window.App.showToast('Nama kelas wajib diisi!', 'warning');
      return;
    }

    if (id) {
      window.Storage.update('kelas', id, { nama_kelas, tingkat, wali_kelas, keterangan }, `Memperbarui kelas ${nama_kelas}`);
      window.App.showToast(`Kelas ${nama_kelas} berhasil diperbarui.`);
    } else {
      const newId = 'kls-' + nama_kelas.toLowerCase().replace(/[^a-z0-9]/g, '');
      window.Storage.insert('kelas', { id: newId, nama_kelas, tingkat, wali_kelas, keterangan }, `Menambahkan kelas baru ${nama_kelas}`);
      window.App.showToast(`Kelas ${nama_kelas} berhasil ditambahkan.`);
    }

    bootstrap.Modal.getInstance(document.getElementById('modalKelas'))?.hide();
    this.renderKelasSelectOptions();
    this.renderKelasTable();
    this.renderMuridTable();
  },

  deleteKelas(id, nama) {
    window.App.confirmModal(
      'Hapus Kelas',
      `Apakah Anda yakin ingin menghapus kelas "${nama}"? Semua data murid di kelas ini akan kehilangan referensi kelas.`,
      () => {
        window.Storage.delete('kelas', id, `Menghapus kelas ${nama}`);
        this.selectedKelasIds.delete(id);
        this.updateKelasSelectionUI();
        window.App.showToast(`Kelas ${nama} berhasil dihapus.`);
        this.renderKelasSelectOptions();
        this.renderKelasTable();
        this.renderMuridTable();
      }
    );
  },

  // -------------------------------------------------------------
  // MURID LOGIC
  // -------------------------------------------------------------
  getFilteredMuridList() {
    let murids = window.Storage.getAll('murid') || [];

    if (this.muridFilterKelas !== 'all') {
      murids = murids.filter(m => m.kelas_id === this.muridFilterKelas);
    }

    if (this.muridSearchQuery) {
      murids = murids.filter(m => 
        (m.nama && m.nama.toLowerCase().includes(this.muridSearchQuery)) ||
        (m.nis_lokal && m.nis_lokal.toLowerCase().includes(this.muridSearchQuery)) ||
        (m.no_absen && String(m.no_absen).includes(this.muridSearchQuery))
      );
    }

    murids.sort((a, b) => {
      let valA = a[this.muridSortBy] || '';
      let valB = b[this.muridSortBy] || '';
      if (this.muridSortBy === 'no_absen') {
        valA = parseInt(valA, 10) || 0;
        valB = parseInt(valB, 10) || 0;
        return this.muridSortAsc ? valA - valB : valB - valA;
      }
      return this.muridSortAsc ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
    });

    return murids;
  },

  renderMuridTable() {
    const tableBody = document.getElementById('tableMuridBody');
    if (!tableBody) return;

    const murids = this.getFilteredMuridList();
    const kelasList = window.Storage.getAll('kelas') || [];
    const kelasMap = {};
    kelasList.forEach(k => { kelasMap[k.id] = k.nama_kelas; });

    document.getElementById('muridCountBadge').innerText = `${murids.length} Siswa`;

    if (murids.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">Tidak ada data murid ditemukan.</td></tr>`;
      return;
    }

    tableBody.innerHTML = murids.map((m, index) => {
      const isSelected = this.selectedMuridIds.has(m.id);
      const namaKelas = kelasMap[m.kelas_id] || '<span class="text-danger">Tanpa Kelas</span>';
      return `
        <tr class="${isSelected ? 'row-selected' : ''}">
          <td class="td-select">
            <input type="checkbox" class="form-check-input form-check-input-custom row-checkbox" data-id="${m.id}" ${isSelected ? 'checked' : ''}>
          </td>
          <td class="text-center fw-bold text-muted">${m.no_absen || index + 1}</td>
          <td class="fw-semibold">${m.nis_lokal || '-'}</td>
          <td>
            <div class="fw-bold text-dark">${m.nama}</div>
            <small class="text-muted">${m.jenis_kelamin === 'P' ? 'Perempuan' : 'Laki-laki'}</small>
          </td>
          <td><span class="badge bg-emerald-soft">${namaKelas}</span></td>
          <td class="text-center">
            <span class="badge ${m.jenis_kelamin === 'P' ? 'bg-rose-soft text-danger' : 'bg-blue-soft text-primary'}">
              ${m.jenis_kelamin === 'P' ? 'P' : 'L'}
            </span>
          </td>
          <td class="text-end">
            <button class="btn btn-sm btn-outline-primary me-1" onclick="DataMaster.openEditMurid('${m.id}')" title="Edit Data Murid">
              <i class="bi bi-pencil-square"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger" onclick="DataMaster.deleteMurid('${m.id}', '${m.nama}')" title="Hapus Murid">
              <i class="bi bi-trash"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');

    // Attach row checkbox listeners
    tableBody.querySelectorAll('.row-checkbox').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const id = e.target.getAttribute('data-id');
        this.toggleSelectMurid(id, e.target.checked);
        const tr = e.target.closest('tr');
        if (e.target.checked) tr?.classList.add('row-selected');
        else tr?.classList.remove('row-selected');
      });
    });

    this.updateMuridSelectionUI();
  },

  openAddMurid() {
    document.getElementById('formMurid').reset();
    document.getElementById('muridId').value = '';
    if (this.muridFilterKelas !== 'all') {
      document.getElementById('muridKelas').value = this.muridFilterKelas;
    }
    document.getElementById('modalMuridTitle').innerText = 'Tambah Data Siswa Baru';
    new bootstrap.Modal(document.getElementById('modalMurid')).show();
  },

  openEditMurid(id) {
    const m = window.Storage.getById('murid', id);
    if (!m) return;

    document.getElementById('muridId').value = m.id;
    document.getElementById('muridNoAbsen').value = m.no_absen || '';
    document.getElementById('muridNis').value = m.nis_lokal || '';
    document.getElementById('muridNama').value = m.nama || '';
    document.getElementById('muridKelas').value = m.kelas_id || '';
    document.getElementById('muridGender').value = m.jenis_kelamin || 'L';
    document.getElementById('modalMuridTitle').innerText = 'Edit Data Siswa';

    new bootstrap.Modal(document.getElementById('modalMurid')).show();
  },

  saveMurid() {
    const id = document.getElementById('muridId').value;
    const no_absen = document.getElementById('muridNoAbsen').value.trim();
    const nis_lokal = document.getElementById('muridNis').value.trim();
    const nama = document.getElementById('muridNama').value.trim();
    const kelas_id = document.getElementById('muridKelas').value;
    const jenis_kelamin = document.getElementById('muridGender').value;

    if (!nama || !kelas_id) {
      window.App.showToast('Nama dan Kelas siswa wajib diisi!', 'warning');
      return;
    }

    if (id) {
      window.Storage.update('murid', id, { no_absen, nis_lokal, nama, kelas_id, jenis_kelamin }, `Memperbarui data murid ${nama}`);
      window.App.showToast(`Data murid ${nama} berhasil diperbarui.`);
    } else {
      window.Storage.insert('murid', { no_absen, nis_lokal, nama, kelas_id, jenis_kelamin }, `Menambahkan murid baru ${nama}`);
      window.App.showToast(`Murid ${nama} berhasil ditambahkan.`);
    }

    bootstrap.Modal.getInstance(document.getElementById('modalMurid'))?.hide();
    this.renderMuridTable();
    this.renderKelasTable();
  },

  deleteMurid(id, nama) {
    window.App.confirmModal(
      'Hapus Murid',
      `Apakah Anda yakin ingin menghapus data murid "${nama}"? Data presensi dan nilai murid ini mungkin terpengaruh.`,
      () => {
        window.Storage.delete('murid', id, `Menghapus murid ${nama}`);
        this.selectedMuridIds.delete(id);
        this.updateMuridSelectionUI();
        window.App.showToast(`Data murid ${nama} berhasil dihapus.`);
        this.renderMuridTable();
        this.renderKelasTable();
      }
    );
  },

  // -------------------------------------------------------------
  // IMPORT & EXPORT CSV MURID
  // -------------------------------------------------------------
  exportMuridCSV() {
    const murids = this.getFilteredMuridList();
    this.exportMuridDataList(murids, `data_murid_${this.muridFilterKelas}_${new Date().toISOString().slice(0, 10)}`);
  },

  exportMuridDataList(dataList, filename) {
    const kelasList = window.Storage.getAll('kelas') || [];
    const kelasMap = {};
    kelasList.forEach(k => { kelasMap[k.id] = k.nama_kelas; });

    const headers = ['No Absen', 'NIS Lokal', 'Nama Lengkap', 'Kelas', 'Jenis Kelamin (L/P)'];
    const rows = dataList.map(m => [
      m.no_absen || '',
      m.nis_lokal || '',
      m.nama || '',
      kelasMap[m.kelas_id] || '',
      m.jenis_kelamin || 'L'
    ]);

    window.App.exportToCSV(filename, headers, rows);
  },

  downloadTemplateMurid() {
    const headers = ['No Absen', 'NIS Lokal', 'Nama Lengkap', 'Nama Kelas (misal: 7-A)', 'Jenis Kelamin (L/P)'];
    const sampleRows = [
      ['1', '121132010001', 'Ahmad Farhan', '7-A', 'L'],
      ['2', '121132010002', 'Aisyah Putri', '7-A', 'P']
    ];
    window.App.exportToCSV('template_import_murid', headers, sampleRows);
  },

  handleImportMuridCSV(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const parsed = window.App.parseCSV(text);
        if (parsed.data.length === 0) {
          window.App.showToast('File CSV tidak memiliki baris data!', 'danger');
          return;
        }

        const kelasList = window.Storage.getAll('kelas') || [];
        let count = 0;

        parsed.data.forEach(row => {
          const no_absen = (row[0] || '').trim();
          const nis_lokal = (row[1] || '').trim();
          const nama = (row[2] || '').trim();
          const rawKelas = (row[3] || '').trim().toLowerCase();
          const jk = (row[4] || 'L').trim().toUpperCase();

          if (nama) {
            let kls = kelasList.find(k => k.nama_kelas.toLowerCase() === rawKelas || k.id.toLowerCase() === rawKelas);
            let kelas_id = kls ? kls.id : (kelasList[0]?.id || '');

            window.Storage.insert('murid', {
              no_absen,
              nis_lokal,
              nama,
              kelas_id,
              jenis_kelamin: jk === 'P' ? 'P' : 'L'
            });
            count++;
          }
        });

        window.Storage.logActivity(`Import ${count} data murid dari CSV`);
        window.App.showToast(`Berhasil mengimpor ${count} data murid.`, 'success');
        this.renderMuridTable();
        this.renderKelasTable();
      } catch (err) {
        window.App.showToast('Gagal membaca file CSV: ' + err.message, 'danger');
      } finally {
        event.target.value = '';
      }
    };
    reader.readAsText(file);
  },

  // -------------------------------------------------------------
  // IMPORT & EXPORT CSV KELAS
  // -------------------------------------------------------------
  exportKelasCSV() {
    const kelasList = window.Storage.getAll('kelas') || [];
    const murids = window.Storage.getAll('murid') || [];

    const headers = ['ID Kelas', 'Nama Kelas', 'Tingkat', 'Wali Kelas', 'Jumlah Siswa', 'Keterangan'];
    const rows = kelasList.map(k => {
      const studentCount = murids.filter(m => m.kelas_id === k.id).length;
      return [k.id, k.nama_kelas, k.tingkat || '7', k.wali_kelas || '', studentCount, k.keterangan || ''];
    });

    window.App.exportToCSV(`data_kelas_${new Date().toISOString().slice(0, 10)}`, headers, rows);
    window.App.showToast('Data kelas berhasil diekspor ke CSV.');
  },

  handleImportKelasCSV(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const parsed = window.App.parseCSV(text);
        if (parsed.data.length === 0) {
          window.App.showToast('File CSV kosong!', 'danger');
          return;
        }

        let count = 0;
        parsed.data.forEach(row => {
          const nama = (row[1] || row[0] || '').trim();
          const tingkat = (row[2] || '7').trim();
          const wali = (row[3] || '').trim();
          const ket = (row[5] || '').trim();

          if (nama) {
            const newId = 'kls-' + nama.toLowerCase().replace(/[^a-z0-9]/g, '');
            window.Storage.insert('kelas', {
              id: newId,
              nama_kelas: nama,
              tingkat,
              wali_kelas: wali,
              keterangan: ket
            });
            count++;
          }
        });

        window.Storage.logActivity(`Import ${count} data kelas dari CSV`);
        window.App.showToast(`Berhasil mengimpor ${count} kelas.`, 'success');
        this.renderKelasSelectOptions();
        this.renderKelasTable();
      } catch (err) {
        window.App.showToast('Gagal import CSV kelas: ' + err.message, 'danger');
      } finally {
        event.target.value = '';
      }
    };
    reader.readAsText(file);
  }
};

window.DataMaster = DataMaster;
