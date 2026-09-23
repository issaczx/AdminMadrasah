/**
 * jurnal.js
 * Modul jurnal pembelajaran harian guru.
 * Kolom: no, tanggal, kelas, tujuan pembelajaran, ketercapaian, jumlah siswa hadir, catatan.
 * Fitur: Selection data massal, auto-sinkron hadir, filter kelas & tanggal, CSV import/export, link cetak periode.
 */

const Jurnal = {
  filterKelas: 'all',
  filterBulan: 0, // 0 = all
  filterTahun: new Date().getFullYear(),
  searchQuery: '',
  selectedIds: new Set(),

  init() {
    this.bindEvents();
    this.populateKelasFilter();
    this.renderTable();
  },

  bindEvents() {
    document.getElementById('filterKelasJurnal')?.addEventListener('change', (e) => {
      this.filterKelas = e.target.value;
      this.clearSelection();
      this.renderTable();
    });

    document.getElementById('filterBulanJurnal')?.addEventListener('change', (e) => {
      this.filterBulan = parseInt(e.target.value, 10);
      this.clearSelection();
      this.renderTable();
    });

    document.getElementById('filterTahunJurnal')?.addEventListener('change', (e) => {
      this.filterTahun = parseInt(e.target.value, 10);
      this.clearSelection();
      this.renderTable();
    });

    document.getElementById('searchJurnal')?.addEventListener('input', (e) => {
      this.searchQuery = e.target.value.toLowerCase();
      this.clearSelection();
      this.renderTable();
    });

    // Selection Data Events
    document.getElementById('selectAllJurnal')?.addEventListener('change', (e) => {
      this.toggleSelectAll(e.target.checked);
    });

    document.getElementById('btnClearSelectionJurnal')?.addEventListener('click', () => {
      this.clearSelection();
    });

    document.getElementById('btnDeleteSelectedJurnal')?.addEventListener('click', () => {
      this.bulkDeleteSelected();
    });

    document.getElementById('btnExportSelectedJurnal')?.addEventListener('click', () => {
      this.bulkExportSelected();
    });

    // Direct link to Print Report with filter range
    document.getElementById('btnGoToPrintJurnal')?.addEventListener('click', () => {
      let url = 'laporan.html?tipe=jurnal';
      if (this.filterKelas !== 'all') {
        url += `&kelas=${this.filterKelas}`;
      }
      if (this.filterBulan !== 0 && this.filterTahun) {
        const mm = String(this.filterBulan).padStart(2, '0');
        const start = `${this.filterTahun}-${mm}-01`;
        const lastDay = new Date(this.filterTahun, this.filterBulan, 0).getDate();
        const end = `${this.filterTahun}-${mm}-${String(lastDay).padStart(2, '0')}`;
        url += `&start=${start}&end=${end}`;
      }
      window.location.href = url;
    });

    // Form Submit
    document.getElementById('formJurnal')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveJurnal();
    });

    // Auto calculate count of attendees when date/class changes in modal form
    document.getElementById('jurnalTanggal')?.addEventListener('change', () => this.autoSyncHadir());
    document.getElementById('jurnalKelas')?.addEventListener('change', () => this.autoSyncHadir());

    // Export CSV
    document.getElementById('btnExportJurnalCSV')?.addEventListener('click', () => {
      this.exportCSV();
    });

    // Import CSV
    document.getElementById('inputImportJurnalCSV')?.addEventListener('change', (e) => {
      this.handleImportCSV(e);
    });
  },

  populateKelasFilter() {
    const kelasList = window.Storage.getAll('kelas') || [];
    const filterSelect = document.getElementById('filterKelasJurnal');
    const formSelect = document.getElementById('jurnalKelas');

    if (filterSelect) {
      filterSelect.innerHTML = '<option value="all">Semua Kelas</option>' + 
        kelasList.map(k => `<option value="${k.id}">${k.nama_kelas}</option>`).join('');
    }

    if (formSelect) {
      formSelect.innerHTML = '<option value="">Pilih Kelas...</option>' + 
        kelasList.map(k => `<option value="${k.id}">${k.nama_kelas}</option>`).join('');
    }
  },

  autoSyncHadir() {
    const tgl = document.getElementById('jurnalTanggal')?.value;
    const klsId = document.getElementById('jurnalKelas')?.value;
    const inputHadir = document.getElementById('jurnalJumlahHadir');
    const syncInfo = document.getElementById('syncHadirInfo');

    if (!tgl || !klsId || !inputHadir) return;

    const allKehadiran = window.Storage.getAll('kehadiran') || [];
    const records = allKehadiran.filter(k => k.tanggal === tgl && k.kelas_id === klsId && k.status === 'hadir');

    if (records.length > 0) {
      inputHadir.value = records.length;
      if (syncInfo) syncInfo.innerHTML = `<i class="bi bi-check-circle text-success me-1"></i> Otomatis ditarik dari data presensi (${records.length} siswa hadir).`;
    } else {
      const allMurid = window.Storage.getAll('murid') || [];
      const totalMuridKelas = allMurid.filter(m => m.kelas_id === klsId).length;
      if (!inputHadir.value) {
        inputHadir.value = totalMuridKelas;
      }
      if (syncInfo) syncInfo.innerHTML = `<span class="text-muted"><i class="bi bi-info-circle me-1"></i> Data presensi tanggal ini belum diinput (default total kelas: ${totalMuridKelas} siswa).</span>`;
    }
  },

  /* --------------------------------------------------------------------------
     Selection Data Management
     -------------------------------------------------------------------------- */
  toggleSelect(id, checked) {
    if (checked) {
      this.selectedIds.add(id);
    } else {
      this.selectedIds.delete(id);
    }
    this.updateSelectionUI();
  },

  toggleSelectAll(checked) {
    const visibleJurnals = this.getFilteredJurnalList();
    if (checked) {
      visibleJurnals.forEach(j => this.selectedIds.add(j.id));
    } else {
      this.selectedIds.clear();
    }
    this.updateSelectionUI();
    this.renderTable();
  },

  clearSelection() {
    this.selectedIds.clear();
    this.updateSelectionUI();
    const selectAllBox = document.getElementById('selectAllJurnal');
    if (selectAllBox) {
      selectAllBox.checked = false;
      selectAllBox.indeterminate = false;
    }
    document.querySelectorAll('#tableJurnalBody tr').forEach(tr => tr.classList.remove('row-selected'));
    document.querySelectorAll('#tableJurnalBody .row-checkbox').forEach(cb => { cb.checked = false; });
  },

  updateSelectionUI() {
    const bar = document.getElementById('selectionBarJurnal');
    const badge = document.getElementById('selectedJurnalCount');
    const selectAllBox = document.getElementById('selectAllJurnal');
    const count = this.selectedIds.size;
    const visibleJurnals = this.getFilteredJurnalList();

    if (count > 0) {
      bar?.classList.remove('d-none');
      if (badge) badge.innerText = `${count} Dipilih`;
    } else {
      bar?.classList.add('d-none');
    }

    if (selectAllBox && visibleJurnals.length > 0) {
      const visibleSelectedCount = visibleJurnals.filter(j => this.selectedIds.has(j.id)).length;
      if (visibleSelectedCount === 0) {
        selectAllBox.checked = false;
        selectAllBox.indeterminate = false;
      } else if (visibleSelectedCount === visibleJurnals.length) {
        selectAllBox.checked = true;
        selectAllBox.indeterminate = false;
      } else {
        selectAllBox.checked = false;
        selectAllBox.indeterminate = true;
      }
    }
  },

  bulkDeleteSelected() {
    const count = this.selectedIds.size;
    if (count === 0) return;

    window.App.confirmModal(
      'Hapus Massal Jurnal',
      `Apakah Anda yakin ingin menghapus ${count} catatan jurnal terpilih sekaligus? Tindakan ini tidak dapat dibatalkan.`,
      () => {
        let allJurnal = window.Storage.getAll('jurnal') || [];
        allJurnal = allJurnal.filter(j => !this.selectedIds.has(j.id));
        window.Storage.setAll('jurnal', allJurnal);
        window.Storage.logActivity(`Menghapus massal ${count} catatan jurnal harian`);
        window.App.showToast(`Berhasil menghapus ${count} catatan jurnal.`);
        
        this.clearSelection();
        this.renderTable();
      }
    );
  },

  bulkExportSelected() {
    const count = this.selectedIds.size;
    if (count === 0) return;

    const allJurnal = window.Storage.getAll('jurnal') || [];
    const selected = allJurnal.filter(j => this.selectedIds.has(j.id));
    this.exportDataListToCSV(selected, `jurnal_terpilih_${count}_entri`);
    window.App.showToast(`Berhasil mengekspor ${count} jurnal terpilih ke CSV.`);
  },

  /* --------------------------------------------------------------------------
     Table Query & Render
     -------------------------------------------------------------------------- */
  getFilteredJurnalList() {
    let jurnals = window.Storage.getAll('jurnal') || [];

    if (this.filterKelas !== 'all') {
      jurnals = jurnals.filter(j => j.kelas_id === this.filterKelas);
    }

    if (this.filterBulan !== 0 || this.filterTahun) {
      jurnals = jurnals.filter(j => {
        if (!j.tanggal) return false;
        const d = new Date(j.tanggal);
        if (this.filterBulan !== 0 && (d.getMonth() + 1) !== this.filterBulan) return false;
        if (this.filterTahun && d.getFullYear() !== this.filterTahun) return false;
        return true;
      });
    }

    if (this.searchQuery) {
      jurnals = jurnals.filter(j => 
        (j.tujuan_pembelajaran && j.tujuan_pembelajaran.toLowerCase().includes(this.searchQuery)) ||
        (j.ketercapaian && j.ketercapaian.toLowerCase().includes(this.searchQuery)) ||
        (j.catatan && j.catatan.toLowerCase().includes(this.searchQuery))
      );
    }

    jurnals.sort((a, b) => new Date(b.tanggal || 0) - new Date(a.tanggal || 0));
    return jurnals;
  },

  renderTable() {
    const tbody = document.getElementById('tableJurnalBody');
    if (!tbody) return;

    const jurnals = this.getFilteredJurnalList();
    const kelasList = window.Storage.getAll('kelas') || [];
    const kelasMap = {};
    kelasList.forEach(k => { kelasMap[k.id] = k.nama_kelas; });

    document.getElementById('jurnalCountBadge').innerText = `${jurnals.length} Catatan Jurnal`;

    if (jurnals.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-4">Belum ada catatan jurnal mengajar sesuai filter.</td></tr>`;
      return;
    }

    tbody.innerHTML = jurnals.map((j, idx) => {
      const isSelected = this.selectedIds.has(j.id);
      const namaKelas = kelasMap[j.kelas_id] || '-';
      return `
        <tr class="${isSelected ? 'row-selected' : ''}">
          <td class="td-select">
            <input type="checkbox" class="form-check-input form-check-input-custom row-checkbox" data-id="${j.id}" ${isSelected ? 'checked' : ''}>
          </td>
          <td class="text-center fw-bold text-muted">${idx + 1}</td>
          <td>
            <div class="fw-bold text-dark">${window.App.formatDate(j.tanggal)}</div>
            <span class="badge bg-light text-secondary">Kelas ${namaKelas}</span>
          </td>
          <td><div class="text-secondary fw-semibold">${j.tujuan_pembelajaran}</div></td>
          <td><div class="small">${j.ketercapaian || '-'}</div></td>
          <td class="text-center fw-bold text-primary">${j.jumlah_hadir || 0}</td>
          <td><small class="text-muted">${j.catatan || '-'}</small></td>
          <td class="text-end" style="white-space: nowrap;">
            <button class="btn btn-sm btn-outline-primary me-1" onclick="Jurnal.openEdit('${j.id}')" title="Edit Jurnal">
              <i class="bi bi-pencil-square"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger" onclick="Jurnal.delete('${j.id}')" title="Hapus Jurnal">
              <i class="bi bi-trash"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');

    // Attach row checkbox listeners
    tbody.querySelectorAll('.row-checkbox').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const id = e.target.getAttribute('data-id');
        this.toggleSelect(id, e.target.checked);
        const tr = e.target.closest('tr');
        if (e.target.checked) tr?.classList.add('row-selected');
        else tr?.classList.remove('row-selected');
      });
    });

    this.updateSelectionUI();
  },

  openAdd() {
    document.getElementById('formJurnal').reset();
    document.getElementById('jurnalId').value = '';
    document.getElementById('modalJurnalTitle').innerText = 'Tulis Jurnal Pembelajaran Guru';
    document.getElementById('syncHadirInfo').innerHTML = '';

    const today = new Date().toISOString().slice(0, 10);
    document.getElementById('jurnalTanggal').value = today;

    if (this.filterKelas !== 'all') {
      document.getElementById('jurnalKelas').value = this.filterKelas;
    }

    this.autoSyncHadir();
    new bootstrap.Modal(document.getElementById('modalJurnal')).show();
  },

  openEdit(id) {
    const j = window.Storage.getById('jurnal', id);
    if (!j) return;

    document.getElementById('jurnalId').value = j.id;
    document.getElementById('jurnalTanggal').value = j.tanggal || '';
    document.getElementById('jurnalKelas').value = j.kelas_id || '';
    document.getElementById('jurnalTujuan').value = j.tujuan_pembelajaran || '';
    document.getElementById('jurnalKetercapaian').value = j.ketercapaian || '';
    document.getElementById('jurnalJumlahHadir').value = j.jumlah_hadir || '';
    document.getElementById('jurnalCatatan').value = j.catatan || '';
    document.getElementById('syncHadirInfo').innerHTML = '';

    document.getElementById('modalJurnalTitle').innerText = 'Edit Jurnal Pembelajaran Guru';
    new bootstrap.Modal(document.getElementById('modalJurnal')).show();
  },

  saveJurnal() {
    const id = document.getElementById('jurnalId').value;
    const tanggal = document.getElementById('jurnalTanggal').value;
    const kelas_id = document.getElementById('jurnalKelas').value;
    const tujuan_pembelajaran = document.getElementById('jurnalTujuan').value.trim();
    const ketercapaian = document.getElementById('jurnalKetercapaian').value.trim();
    const jumlah_hadir = parseInt(document.getElementById('jurnalJumlahHadir').value, 10) || 0;
    const catatan = document.getElementById('jurnalCatatan').value.trim();

    if (!tanggal || !kelas_id || !tujuan_pembelajaran) {
      window.App.showToast('Tanggal, Kelas, dan Tujuan Pembelajaran wajib diisi!', 'warning');
      return;
    }

    const payload = {
      tanggal,
      kelas_id,
      tujuan_pembelajaran,
      ketercapaian,
      jumlah_hadir,
      catatan
    };

    if (id) {
      window.Storage.update('jurnal', id, payload, `Edit jurnal mengajar (${tanggal})`);
      window.App.showToast('Jurnal pembelajaran berhasil diperbarui.');
    } else {
      window.Storage.insert('jurnal', payload, `Tambah jurnal mengajar baru (${tanggal})`);
      window.App.showToast('Jurnal pembelajaran berhasil disimpan.');
    }

    bootstrap.Modal.getInstance(document.getElementById('modalJurnal'))?.hide();
    this.renderTable();
  },

  delete(id) {
    window.App.confirmModal(
      'Hapus Jurnal',
      'Apakah Anda yakin ingin menghapus catatan jurnal mengajar ini?',
      () => {
        window.Storage.delete('jurnal', id, 'Menghapus catatan jurnal mengajar');
        this.selectedIds.delete(id);
        this.updateSelectionUI();
        window.App.showToast('Catatan jurnal berhasil dihapus.');
        this.renderTable();
      }
    );
  },

  exportCSV() {
    const jurnals = this.getFilteredJurnalList();
    this.exportDataListToCSV(jurnals, `rekap_jurnal_guru_${new Date().toISOString().slice(0, 10)}`);
  },

  exportDataListToCSV(dataList, filename) {
    const kelasList = window.Storage.getAll('kelas') || [];
    const kelasMap = {};
    kelasList.forEach(k => { kelasMap[k.id] = k.nama_kelas; });

    const headers = ['No', 'Tanggal', 'Kelas', 'Tujuan Pembelajaran', 'Ketercapaian', 'Jumlah Hadir', 'Catatan / Refleksi'];
    const rows = dataList.map((j, idx) => [
      idx + 1,
      j.tanggal || '',
      kelasMap[j.kelas_id] || '',
      j.tujuan_pembelajaran || '',
      j.ketercapaian || '',
      j.jumlah_hadir || 0,
      j.catatan || ''
    ]);

    window.App.exportToCSV(filename, headers, rows);
  },

  handleImportCSV(event) {
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

        const kelasList = window.Storage.getAll('kelas') || [];
        let count = 0;

        parsed.data.forEach(row => {
          // [No, Tanggal, Kelas, Tujuan, Ketercapaian, Jml Hadir, Catatan]
          const tgl = (row[1] || '').trim();
          const namaKelas = (row[2] || '').trim().toLowerCase();
          const tujuan = (row[3] || '').trim();
          const ketercapaian = (row[4] || '').trim();
          const jml = parseInt(row[5], 10) || 0;
          const catatan = (row[6] || '').trim();

          const kls = kelasList.find(k => k.nama_kelas.toLowerCase() === namaKelas || k.id === namaKelas);
          if (tgl && tujuan && kls) {
            window.Storage.insert('jurnal', {
              tanggal: tgl,
              kelas_id: kls.id,
              tujuan_pembelajaran: tujuan,
              ketercapaian: ketercapaian,
              jumlah_hadir: jml,
              catatan: catatan
            });
            count++;
          }
        });

        window.Storage.logActivity(`Import ${count} data jurnal pembelajaran dari CSV`);
        window.App.showToast(`Berhasil mengimpor ${count} catatan jurnal.`, 'success');
        this.renderTable();
      } catch (err) {
        window.App.showToast('Gagal import CSV jurnal: ' + err.message, 'danger');
      } finally {
        event.target.value = '';
      }
    };
    reader.readAsText(file);
  }
};

window.Jurnal = Jurnal;
