/**
 * nilai.js
 * Modul rekap dan analisis nilai sumatif murid, kalkulasi nilai akhir otomatis,
 * penambahan kolom penilaian dinamis (spreadsheet mode), dan selection data massal.
 */

const Nilai = {
  filterKelas: 'all',
  filterAsesmen: 'all',
  filterStatusKktp: 'all', // 'all' | 'remedial' | 'tuntas' | 'pengayaan'
  kktpValue: 75,
  searchQuery: '',

  // Selection Data state
  selectedIds: new Set(),

  // Dynamic Grade Table (Spreadsheet) Modal State
  activeColumns: ['TP 1', 'TP 2', 'Tugas', 'STS', 'SAS'],
  currentModalKelasId: '',
  gridScoresCache: {}, // { [muridId]: { [colName]: val } }

  init() {
    const settings = window.Storage.getAll('madrasah') || {};
    if (settings.kktp_default) {
      this.kktpValue = Number(settings.kktp_default);
    }

    const kktpInput = document.getElementById('inputKktpValue');
    if (kktpInput) kktpInput.value = this.kktpValue;

    this.bindEvents();
    this.populateKelasFilter();
    this.populateAsesmenFilter();
    this.renderTable();
    this.renderAnalisis();
  },

  bindEvents() {
    // Filter Kelas
    document.getElementById('filterKelasNilai')?.addEventListener('change', (e) => {
      this.filterKelas = e.target.value;
      this.populateAsesmenFilter();
      this.clearSelection();
      this.renderTable();
      this.renderAnalisis();
    });

    // Filter Asesmen
    document.getElementById('filterAsesmenNilai')?.addEventListener('change', (e) => {
      this.filterAsesmen = e.target.value;
      this.clearSelection();
      this.renderTable();
      this.renderAnalisis();
    });

    // Ubah KKTP Global
    document.getElementById('inputKktpValue')?.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val) && val > 0) {
        this.kktpValue = val;
        this.renderTable();
        this.renderAnalisis();
      }
    });

    // Search Query
    document.getElementById('searchNilai')?.addEventListener('input', (e) => {
      this.searchQuery = e.target.value.toLowerCase();
      this.clearSelection();
      this.renderTable();
    });

    // Filter Status KKTP Pills
    document.querySelectorAll('.kktp-filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.kktp-filter-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.filterStatusKktp = e.target.getAttribute('data-status');
        this.clearSelection();
        this.renderTable();
      });
    });

    // Selection Data Events
    document.getElementById('selectAllNilai')?.addEventListener('change', (e) => {
      this.toggleSelectAll(e.target.checked);
    });

    document.getElementById('btnClearSelectionNilai')?.addEventListener('click', () => {
      this.clearSelection();
    });

    document.getElementById('btnDeleteSelectedNilai')?.addEventListener('click', () => {
      this.bulkDeleteSelected();
    });

    document.getElementById('btnExportSelectedNilai')?.addEventListener('click', () => {
      this.bulkExportSelected();
    });

    // Modal Dynamic Grade Table Events
    document.getElementById('modalTabelKelasSelect')?.addEventListener('change', (e) => {
      this.currentModalKelasId = e.target.value;
      this.loadExistingScoresForGrid();
      this.renderTableGrid();
    });

    document.getElementById('modalTabelAsesmenNama')?.addEventListener('input', () => {
      this.loadExistingScoresForGrid();
      this.renderTableGrid();
    });

    document.getElementById('modalTabelKktpInput')?.addEventListener('input', () => {
      this.recalcAllGridRows();
    });

    // Add Custom Column
    document.getElementById('btnAddCustomColumn')?.addEventListener('click', () => {
      const input = document.getElementById('inputNewColumnName');
      const colName = input?.value.trim();
      if (colName) {
        this.addColumn(colName);
        input.value = '';
      }
    });

    document.getElementById('inputNewColumnName')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        document.getElementById('btnAddCustomColumn')?.click();
      }
    });

    // Quick Preset Buttons
    document.querySelectorAll('.btn-preset-col').forEach(btn => {
      btn.addEventListener('click', () => {
        const col = btn.getAttribute('data-col');
        if (col) this.addColumn(col);
      });
    });

    // Save All Button in Modal Table
    document.getElementById('btnSaveAllTableNilai')?.addEventListener('click', () => {
      this.saveAllTableNilai();
    });

    // Single Edit Form Submit
    document.getElementById('formNilaiSingle')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveSingleNilai();
    });

    // Export CSV
    document.getElementById('btnExportNilaiCSV')?.addEventListener('click', () => {
      this.exportCSV();
    });

    // Import CSV
    document.getElementById('inputImportNilaiCSV')?.addEventListener('change', (e) => {
      this.handleImportCSV(e);
    });
  },

  populateKelasFilter() {
    const kelasList = window.Storage.getAll('kelas') || [];
    const filterSelect = document.getElementById('filterKelasNilai');
    const modalSelect = document.getElementById('modalTabelKelasSelect');

    if (filterSelect) {
      filterSelect.innerHTML = '<option value="all">Semua Kelas</option>' + 
        kelasList.map(k => `<option value="${k.id}">${k.nama_kelas}</option>`).join('');
    }

    if (modalSelect) {
      modalSelect.innerHTML = '<option value="">Pilih Kelas...</option>' + 
        kelasList.map(k => `<option value="${k.id}">Kelas ${k.nama_kelas}</option>`).join('');
    }
  },

  populateAsesmenFilter() {
    const allNilai = window.Storage.getAll('nilai') || [];
    const filterSelect = document.getElementById('filterAsesmenNilai');
    if (!filterSelect) return;

    const asesmenSet = new Set();
    allNilai.forEach(n => {
      if (n.nama_asesmen) asesmenSet.add(n.nama_asesmen);
    });

    filterSelect.innerHTML = '<option value="all">Semua Asesmen</option>' + 
      Array.from(asesmenSet).map(a => `<option value="${a}">${a}</option>`).join('');
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
    const visibleNilais = this.getFilteredNilaiList();
    if (checked) {
      visibleNilais.forEach(n => this.selectedIds.add(n.id));
    } else {
      this.selectedIds.clear();
    }
    this.updateSelectionUI();
    this.renderTable();
  },

  clearSelection() {
    this.selectedIds.clear();
    this.updateSelectionUI();
    const selectAllBox = document.getElementById('selectAllNilai');
    if (selectAllBox) {
      selectAllBox.checked = false;
      selectAllBox.indeterminate = false;
    }
    document.querySelectorAll('#tableNilaiBody tr').forEach(tr => tr.classList.remove('row-selected'));
    document.querySelectorAll('#tableNilaiBody .row-checkbox').forEach(cb => { cb.checked = false; });
  },

  updateSelectionUI() {
    const bar = document.getElementById('selectionBarNilai');
    const badge = document.getElementById('selectedNilaiCount');
    const selectAllBox = document.getElementById('selectAllNilai');
    const count = this.selectedIds.size;
    const visibleNilais = this.getFilteredNilaiList();

    if (count > 0) {
      bar?.classList.remove('d-none');
      if (badge) badge.innerText = `${count} Dipilih`;
    } else {
      bar?.classList.add('d-none');
    }

    if (selectAllBox && visibleNilais.length > 0) {
      const visibleSelectedCount = visibleNilais.filter(n => this.selectedIds.has(n.id)).length;
      if (visibleSelectedCount === 0) {
        selectAllBox.checked = false;
        selectAllBox.indeterminate = false;
      } else if (visibleSelectedCount === visibleNilais.length) {
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
      'Hapus Massal Nilai',
      `Apakah Anda yakin ingin menghapus ${count} data nilai terpilih sekaligus? Tindakan ini tidak dapat dibatalkan.`,
      () => {
        let allNilai = window.Storage.getAll('nilai') || [];
        allNilai = allNilai.filter(n => !this.selectedIds.has(n.id));
        window.Storage.setAll('nilai', allNilai);
        window.Storage.logActivity(`Menghapus massal ${count} data nilai sumatif`);
        window.App.showToast(`Berhasil menghapus ${count} data nilai.`);
        
        this.clearSelection();
        this.populateAsesmenFilter();
        this.renderTable();
        this.renderAnalisis();
      }
    );
  },

  bulkExportSelected() {
    const count = this.selectedIds.size;
    if (count === 0) return;

    const allNilai = window.Storage.getAll('nilai') || [];
    const selectedNilai = allNilai.filter(n => this.selectedIds.has(n.id));
    this.exportDataListToCSV(selectedNilai, `rekap_nilai_terpilih_${count}_siswa`);
    window.App.showToast(`Berhasil mengekspor ${count} nilai terpilih ke CSV.`);
  },

  /* --------------------------------------------------------------------------
     Data Query & Table Rendering
     -------------------------------------------------------------------------- */
  getFilteredNilaiList() {
    let nilais = window.Storage.getAll('nilai') || [];
    const murids = window.Storage.getAll('murid') || [];
    const muridMap = {};
    murids.forEach(m => { muridMap[m.id] = m; });

    if (this.filterKelas !== 'all') {
      nilais = nilais.filter(n => {
        const m = muridMap[n.murid_id];
        return (m && m.kelas_id === this.filterKelas) || (n.kelas_id === this.filterKelas);
      });
    }

    if (this.filterAsesmen !== 'all') {
      nilais = nilais.filter(n => n.nama_asesmen === this.filterAsesmen);
    }

    if (this.searchQuery) {
      nilais = nilais.filter(n => {
        const m = muridMap[n.murid_id];
        return (m && m.nama.toLowerCase().includes(this.searchQuery)) ||
               (n.nama_asesmen && n.nama_asesmen.toLowerCase().includes(this.searchQuery));
      });
    }

    if (this.filterStatusKktp !== 'all') {
      nilais = nilais.filter(n => {
        const val = Number(n.nilai_akhir) || 0;
        if (this.filterStatusKktp === 'remedial') return val < this.kktpValue;
        if (this.filterStatusKktp === 'pengayaan') return val >= 88;
        if (this.filterStatusKktp === 'tuntas') return val >= this.kktpValue;
        return true;
      });
    }

    return nilais;
  },

  renderTable() {
    const tbody = document.getElementById('tableNilaiBody');
    if (!tbody) return;

    const nilais = this.getFilteredNilaiList();
    const murids = window.Storage.getAll('murid') || [];
    const kelasList = window.Storage.getAll('kelas') || [];

    const muridMap = {};
    murids.forEach(m => { muridMap[m.id] = m; });

    const kelasMap = {};
    kelasList.forEach(k => { kelasMap[k.id] = k.nama_kelas; });

    document.getElementById('nilaiCountBadge').innerText = `${nilais.length} Rekap Nilai`;

    if (nilais.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-4">Belum ada data nilai sesuai filter.</td></tr>`;
      return;
    }

    tbody.innerHTML = nilais.map((n, idx) => {
      const isSelected = this.selectedIds.has(n.id);
      const m = muridMap[n.murid_id] || { nama: 'Siswa Tidak Dikenal', nis_lokal: '-', no_absen: idx + 1, kelas_id: n.kelas_id };
      const namaKelas = kelasMap[m.kelas_id || n.kelas_id] || '-';
      const na = Number(n.nilai_akhir) || 0;
      
      let statusBadge = '';
      if (na < this.kktpValue) {
        statusBadge = `<span class="badge bg-danger"><i class="bi bi-exclamation-circle me-1"></i>Remedial</span>`;
      } else if (na >= 88) {
        statusBadge = `<span class="badge bg-emerald-soft text-success"><i class="bi bi-star-fill text-warning me-1"></i>Pengayaan</span>`;
      } else {
        statusBadge = `<span class="badge bg-light text-dark border"><i class="bi bi-check me-1"></i>Tuntas</span>`;
      }

      // Format rincian nilai komponen
      let komponenHtml = '';
      if (n.komponen_nilai && Object.keys(n.komponen_nilai).length > 0) {
        komponenHtml = Object.entries(n.komponen_nilai)
          .map(([k, v]) => `<span class="badge bg-light text-secondary border me-1 mb-1" style="font-size: 0.75rem;">${k}: <b>${v}</b></span>`)
          .join('');
      } else {
        const nh = n.nilai_harian ?? '-';
        const nas = n.nilai_akhir_semester ?? '-';
        komponenHtml = `<span class="badge bg-light text-secondary border me-1">NH: <b>${nh}</b></span><span class="badge bg-light text-secondary border">SAS: <b>${nas}</b></span>`;
      }

      return `
        <tr class="${isSelected ? 'row-selected' : ''}">
          <td class="td-select">
            <input type="checkbox" class="form-check-input form-check-input-custom row-checkbox" data-id="${n.id}" ${isSelected ? 'checked' : ''}>
          </td>
          <td class="text-center fw-bold text-muted">${m.no_absen || idx + 1}</td>
          <td>
            <div class="fw-bold text-dark">${m.nama}</div>
            <small class="text-muted">NIS: ${m.nis_lokal || '-'} | <span class="badge bg-light text-secondary">${namaKelas}</span></small>
          </td>
          <td><div class="fw-semibold text-secondary">${n.nama_asesmen || '-'}</div></td>
          <td class="text-center">${komponenHtml}</td>
          <td class="text-center">
            <span class="fs-6 fw-bold ${na >= this.kktpValue ? 'text-primary' : 'text-danger'}">${na}</span>
          </td>
          <td class="text-center">${statusBadge}</td>
          <td class="text-end" style="white-space: nowrap;">
            <button class="btn btn-sm btn-outline-primary me-1" onclick="Nilai.openEditSingle('${n.id}')" title="Edit Nilai">
              <i class="bi bi-pencil-square"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger" onclick="Nilai.delete('${n.id}')" title="Hapus Nilai">
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

  renderAnalisis() {
    const nilais = this.getFilteredNilaiList();

    if (nilais.length === 0) {
      document.getElementById('statNilaiRata').innerText = '0.0';
      document.getElementById('statNilaiMax').innerText = '0';
      document.getElementById('statNilaiMin').innerText = '0';
      document.getElementById('statTuntasPersen').innerText = '0%';
      document.getElementById('statRemedialCount').innerText = '0 Siswa';
      return;
    }

    const values = nilais.map(n => Number(n.nilai_akhir) || 0);
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = (sum / values.length).toFixed(1);
    const max = Math.max(...values);
    const min = Math.min(...values);

    const tuntasCount = values.filter(v => v >= this.kktpValue).length;
    const remedialCount = values.filter(v => v < this.kktpValue).length;
    const tuntasPersen = ((tuntasCount / values.length) * 100).toFixed(1);

    document.getElementById('statNilaiRata').innerText = avg;
    document.getElementById('statNilaiMax').innerText = max;
    document.getElementById('statNilaiMin').innerText = min;
    document.getElementById('statTuntasPersen').innerText = `${tuntasPersen}%`;
    document.getElementById('statRemedialCount').innerText = `${remedialCount} Siswa`;
  },

  /* --------------------------------------------------------------------------
     DYNAMIC TABLE INPUT (SPREADSHEET MODE)
     -------------------------------------------------------------------------- */
  openAdd() {
    const kelasList = window.Storage.getAll('kelas') || [];
    this.populateKelasFilter();

    // Default class selection
    if (this.filterKelas !== 'all') {
      this.currentModalKelasId = this.filterKelas;
    } else if (kelasList.length > 0) {
      this.currentModalKelasId = kelasList[0].id;
    }

    const modalKelasSelect = document.getElementById('modalTabelKelasSelect');
    if (modalKelasSelect) modalKelasSelect.value = this.currentModalKelasId;

    const modalAsesmenInput = document.getElementById('modalTabelAsesmenNama');
    if (modalAsesmenInput) {
      modalAsesmenInput.value = (this.filterAsesmen !== 'all') ? this.filterAsesmen : '';
    }

    const modalKktpInput = document.getElementById('modalTabelKktpInput');
    if (modalKktpInput) modalKktpInput.value = this.kktpValue;

    // Reset columns to standard default if empty
    if (!this.activeColumns || this.activeColumns.length === 0) {
      this.activeColumns = ['TP 1', 'TP 2', 'Tugas', 'STS', 'SAS'];
    }

    this.renderActiveColumnsList();
    this.loadExistingScoresForGrid();
    this.renderTableGrid();

    new bootstrap.Modal(document.getElementById('modalNilaiTabel')).show();
  },

  renderActiveColumnsList() {
    const container = document.getElementById('containerActiveColumns');
    if (!container) return;

    if (this.activeColumns.length === 0) {
      container.innerHTML = '<span class="text-muted small fst-italic">Belum ada kolom penilaian. Klik preset atau tambah kolom di bawah.</span>';
      return;
    }

    container.innerHTML = this.activeColumns.map((col, idx) => `
      <span class="col-pill-badge">
        <span>${col}</span>
        <span class="btn-remove-col" onclick="Nilai.removeColumn(${idx})" title="Hapus kolom ${col}">&times;</span>
      </span>
    `).join('');
  },

  addColumn(name) {
    const clean = name.trim();
    if (!clean) return;
    if (this.activeColumns.includes(clean)) {
      window.App.showToast(`Kolom "${clean}" sudah ada.`, 'warning');
      return;
    }

    // Save current values in grid first
    this.syncGridScoresFromInputs();
    this.activeColumns.push(clean);
    this.renderActiveColumnsList();
    this.renderTableGrid();
  },

  removeColumn(index) {
    if (this.activeColumns.length <= 1) {
      window.App.showToast('Minimal harus ada 1 kolom penilaian!', 'warning');
      return;
    }
    this.syncGridScoresFromInputs();
    const removed = this.activeColumns.splice(index, 1);
    this.renderActiveColumnsList();
    this.renderTableGrid();
    window.App.showToast(`Kolom "${removed}" dihapus dari tabel.`);
  },

  syncGridScoresFromInputs() {
    document.querySelectorAll('.input-score-cell').forEach(inp => {
      const muridId = inp.getAttribute('data-murid-id');
      const col = inp.getAttribute('data-col');
      const val = inp.value !== '' ? parseFloat(inp.value) : '';
      if (!this.gridScoresCache[muridId]) this.gridScoresCache[muridId] = {};
      this.gridScoresCache[muridId][col] = val;
    });
  },

  loadExistingScoresForGrid() {
    this.gridScoresCache = {};
    const asesmen = document.getElementById('modalTabelAsesmenNama')?.value.trim();
    if (!this.currentModalKelasId || !asesmen) return;

    const allNilai = window.Storage.getAll('nilai') || [];
    const matched = allNilai.filter(n => 
      n.kelas_id === this.currentModalKelasId && 
      n.nama_asesmen.toLowerCase() === asesmen.toLowerCase()
    );

    matched.forEach(n => {
      this.gridScoresCache[n.murid_id] = {};
      if (n.komponen_nilai) {
        Object.entries(n.komponen_nilai).forEach(([k, v]) => {
          this.gridScoresCache[n.murid_id][k] = v;
          if (!this.activeColumns.includes(k)) {
            this.activeColumns.push(k);
          }
        });
      } else {
        if (n.nilai_harian !== undefined) this.gridScoresCache[n.murid_id]['TP 1'] = n.nilai_harian;
        if (n.nilai_akhir_semester !== undefined) this.gridScoresCache[n.murid_id]['SAS'] = n.nilai_akhir_semester;
      }
    });

    this.renderActiveColumnsList();
  },

  renderTableGrid() {
    const trHeader = document.getElementById('trHeaderGrid');
    const tbody = document.getElementById('tbodyGridMurid');
    if (!trHeader || !tbody) return;

    // 1. Render Headers
    let headerHtml = `
      <th style="width: 40px;">No</th>
      <th style="width: 100px;">NIS</th>
      <th style="width: 220px;">Nama Siswa</th>
    `;

    this.activeColumns.forEach(col => {
      headerHtml += `<th style="width: 90px;" class="text-center">${col}</th>`;
    });

    headerHtml += `
      <th style="width: 110px;" class="text-center bg-light">Nilai Akhir</th>
      <th style="width: 130px;" class="text-center bg-light">Status KKTP</th>
    `;
    trHeader.innerHTML = headerHtml;

    // 2. Render Rows per Murid
    const allMurid = window.Storage.getAll('murid') || [];
    const muridKelas = allMurid.filter(m => m.kelas_id === this.currentModalKelasId)
      .sort((a, b) => (parseInt(a.no_absen, 10) || 0) - (parseInt(b.no_absen, 10) || 0));

    document.getElementById('modalStatTotalMurid').innerText = muridKelas.length;

    if (muridKelas.length === 0) {
      tbody.innerHTML = `<tr><td colspan="${this.activeColumns.length + 5}" class="text-center text-muted py-4">Tidak ada siswa terdaftar pada kelas ini.</td></tr>`;
      this.recalcModalSummary([]);
      return;
    }

    tbody.innerHTML = muridKelas.map((m, idx) => {
      const studentCache = this.gridScoresCache[m.id] || {};
      
      let colInputsHtml = '';
      this.activeColumns.forEach(col => {
        const val = studentCache[col] !== undefined ? studentCache[col] : '';
        colInputsHtml += `
          <td class="text-center p-1">
            <input type="number" step="0.1" min="0" max="100" 
              class="table-input-score input-score-cell" 
              data-murid-id="${m.id}" 
              data-col="${col}" 
              value="${val}" 
              placeholder="0-100">
          </td>
        `;
      });

      return `
        <tr data-murid-row="${m.id}">
          <td class="text-center fw-bold text-muted">${m.no_absen || idx + 1}</td>
          <td><small class="text-muted">${m.nis_lokal || '-'}</small></td>
          <td><div class="fw-bold text-dark text-truncate" style="max-width: 200px;">${m.nama}</div></td>
          ${colInputsHtml}
          <td class="text-center bg-light">
            <span class="fw-bold fs-6 text-primary" id="finalScore_${m.id}">0.0</span>
          </td>
          <td class="text-center bg-light" id="statusContainer_${m.id}">
            <span class="badge bg-secondary">-</span>
          </td>
        </tr>
      `;
    }).join('');

    // Attach real-time input calculate listeners
    tbody.querySelectorAll('.input-score-cell').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const muridId = e.target.getAttribute('data-murid-id');
        this.calcRowLive(muridId);
        this.recalcAllGridRows();
      });
    });

    this.recalcAllGridRows();
  },

  calcRowLive(muridId) {
    const row = document.querySelector(`tr[data-murid-row="${muridId}"]`);
    if (!row) return;

    const kktpInput = document.getElementById('modalTabelKktpInput');
    const kktp = parseFloat(kktpInput?.value) || this.kktpValue;

    const scoreInputs = row.querySelectorAll('.input-score-cell');
    let sum = 0;
    let count = 0;

    scoreInputs.forEach(inp => {
      const val = parseFloat(inp.value);
      if (!isNaN(val)) {
        sum += val;
        count++;
      }
    });

    const finalVal = count > 0 ? (sum / count).toFixed(1) : '0.0';
    const numFinal = parseFloat(finalVal);

    const scoreEl = document.getElementById(`finalScore_${muridId}`);
    const statusEl = document.getElementById(`statusContainer_${muridId}`);

    if (scoreEl) {
      scoreEl.innerText = finalVal;
      scoreEl.className = `fw-bold fs-6 ${numFinal >= kktp ? 'text-primary' : 'text-danger'}`;
    }

    if (statusEl) {
      if (count === 0) {
        statusEl.innerHTML = '<span class="badge bg-light text-muted border">Belum dinilai</span>';
      } else if (numFinal < kktp) {
        statusEl.innerHTML = '<span class="badge bg-danger">Remedial</span>';
      } else if (numFinal >= 88) {
        statusEl.innerHTML = '<span class="badge bg-success">Pengayaan</span>';
      } else {
        statusEl.innerHTML = '<span class="badge bg-emerald-soft">Tuntas</span>';
      }
    }
  },

  recalcAllGridRows() {
    const allMurid = window.Storage.getAll('murid') || [];
    const muridKelas = allMurid.filter(m => m.kelas_id === this.currentModalKelasId);
    
    muridKelas.forEach(m => {
      this.calcRowLive(m.id);
    });

    // Compute footer stats
    const kktpInput = document.getElementById('modalTabelKktpInput');
    const kktp = parseFloat(kktpInput?.value) || this.kktpValue;

    let totalScore = 0;
    let filledStudents = 0;
    let tuntasCount = 0;
    let remedialCount = 0;

    muridKelas.forEach(m => {
      const scoreEl = document.getElementById(`finalScore_${m.id}`);
      const val = parseFloat(scoreEl?.innerText) || 0;
      if (val > 0) {
        totalScore += val;
        filledStudents++;
        if (val >= kktp) tuntasCount++;
        else remedialCount++;
      }
    });

    const avg = filledStudents > 0 ? (totalScore / filledStudents).toFixed(1) : '0.0';
    document.getElementById('modalStatRataKelas').innerText = avg;
    document.getElementById('modalStatTuntasBadge').innerText = `${tuntasCount} Tuntas`;
    document.getElementById('modalStatRemedialBadge').innerText = `${remedialCount} Remedial`;
  },

  saveAllTableNilai() {
    const kelasId = document.getElementById('modalTabelKelasSelect')?.value;
    const namaAsesmen = document.getElementById('modalTabelAsesmenNama')?.value.trim();
    const kktp = parseFloat(document.getElementById('modalTabelKktpInput')?.value) || this.kktpValue;

    if (!kelasId) {
      window.App.showToast('Silakan pilih kelas terlebih dahulu!', 'warning');
      return;
    }

    if (!namaAsesmen) {
      window.App.showToast('Nama Asesmen / Topik Pembelajaran wajib diisi!', 'warning');
      document.getElementById('modalTabelAsesmenNama')?.focus();
      return;
    }

    const allMurid = window.Storage.getAll('murid') || [];
    const muridKelas = allMurid.filter(m => m.kelas_id === kelasId);

    if (muridKelas.length === 0) {
      window.App.showToast('Tidak ada siswa di kelas ini untuk disimpan nilainya!', 'warning');
      return;
    }

    let allNilai = window.Storage.getAll('nilai') || [];
    let savedCount = 0;

    muridKelas.forEach(m => {
      const row = document.querySelector(`tr[data-murid-row="${m.id}"]`);
      if (!row) return;

      const komponen = {};
      let sum = 0;
      let count = 0;

      row.querySelectorAll('.input-score-cell').forEach(inp => {
        const colName = inp.getAttribute('data-col');
        const val = inp.value !== '' ? parseFloat(inp.value) : null;
        if (val !== null && !isNaN(val)) {
          komponen[colName] = val;
          sum += val;
          count++;
        }
      });

      // Hanya simpan siswa yang memiliki setidaknya 1 komponen nilai
      if (count > 0) {
        const nilaiAkhir = parseFloat((sum / count).toFixed(1));
        const statusKetercapaian = nilaiAkhir >= kktp ? (nilaiAkhir >= 88 ? 'Tuntas (Pengayaan)' : 'Tuntas') : 'Perlu Remedial';

        // Check if existing record exists for this student and assessment
        const existingIndex = allNilai.findIndex(n => 
          n.murid_id === m.id && 
          n.nama_asesmen.toLowerCase() === namaAsesmen.toLowerCase()
        );

        const payload = {
          murid_id: m.id,
          kelas_id: kelasId,
          nama_asesmen: namaAsesmen,
          komponen_nilai: komponen,
          nilai_harian: komponen['TP 1'] || komponen['Tugas'] || nilaiAkhir,
          nilai_akhir_semester: komponen['SAS'] || komponen['STS'] || nilaiAkhir,
          nilai_akhir: nilaiAkhir,
          kktp: kktp,
          status_ketercapaian: statusKetercapaian,
          updatedAt: new Date().toISOString()
        };

        if (existingIndex !== -1) {
          allNilai[existingIndex] = { ...allNilai[existingIndex], ...payload };
        } else {
          payload.id = 'nil-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
          payload.createdAt = new Date().toISOString();
          allNilai.push(payload);
        }
        savedCount++;
      }
    });

    if (savedCount === 0) {
      window.App.showToast('Belum ada nilai siswa yang diisi!', 'warning');
      return;
    }

    window.Storage.setAll('nilai', allNilai);
    window.Storage.logActivity(`Input/Update massal ${savedCount} nilai siswa kelas ${kelasId} (${namaAsesmen})`);
    window.App.showToast(`Berhasil menyimpan nilai untuk ${savedCount} siswa.`);

    bootstrap.Modal.getInstance(document.getElementById('modalNilaiTabel'))?.hide();
    this.populateAsesmenFilter();
    this.renderTable();
    this.renderAnalisis();
  },

  /* --------------------------------------------------------------------------
     Single Student Edit Modal
     -------------------------------------------------------------------------- */
  openEditSingle(id) {
    const n = window.Storage.getById('nilai', id);
    if (!n) return;

    const m = window.Storage.getById('murid', n.murid_id);
    document.getElementById('singleNilaiId').value = n.id;
    document.getElementById('singleNamaSiswa').innerText = m ? `${m.nama} (${m.nis_lokal || '-'})` : 'Siswa Tidak Dikenal';
    document.getElementById('singleNamaAsesmen').value = n.nama_asesmen || '';

    const container = document.getElementById('singleKomponenInputsContainer');
    const komponen = n.komponen_nilai || { 'Nilai Harian': n.nilai_harian || 0, 'Nilai Akhir Semester': n.nilai_akhir_semester || 0 };

    container.innerHTML = Object.entries(komponen).map(([k, v]) => `
      <div class="row align-items-center mb-2">
        <label class="col-6 col-form-label small fw-bold">${k}</label>
        <div class="col-6">
          <input type="number" step="0.1" min="0" max="100" class="form-control form-control-sm text-center single-komp-input" data-col="${k}" value="${v}" required>
        </div>
      </div>
    `).join('');

    const calcSingle = () => {
      let sum = 0, count = 0;
      container.querySelectorAll('.single-komp-input').forEach(inp => {
        const val = parseFloat(inp.value) || 0;
        sum += val;
        count++;
      });
      const na = count > 0 ? (sum / count).toFixed(1) : '0.0';
      document.getElementById('singleNilaiAkhir').value = na;
      const numNa = parseFloat(na);
      const badge = document.getElementById('singleKktpPreviewBadge');
      if (badge) {
        if (numNa < this.kktpValue) {
          badge.innerHTML = '<span class="badge bg-danger">Perlu Remedial</span>';
        } else if (numNa >= 88) {
          badge.innerHTML = '<span class="badge bg-success">Tuntas (Pengayaan)</span>';
        } else {
          badge.innerHTML = '<span class="badge bg-emerald-soft">Tuntas</span>';
        }
      }
    };

    container.querySelectorAll('.single-komp-input').forEach(inp => {
      inp.addEventListener('input', calcSingle);
    });

    calcSingle();
    new bootstrap.Modal(document.getElementById('modalNilaiSingle')).show();
  },

  saveSingleNilai() {
    const id = document.getElementById('singleNilaiId').value;
    const namaAsesmen = document.getElementById('singleNamaAsesmen').value.trim();
    if (!id || !namaAsesmen) return;

    const existing = window.Storage.getById('nilai', id);
    if (!existing) return;

    const komponen = {};
    let sum = 0, count = 0;
    document.querySelectorAll('#singleKomponenInputsContainer .single-komp-input').forEach(inp => {
      const k = inp.getAttribute('data-col');
      const v = parseFloat(inp.value) || 0;
      komponen[k] = v;
      sum += v;
      count++;
    });

    const nilaiAkhir = count > 0 ? parseFloat((sum / count).toFixed(1)) : 0;
    const status = nilaiAkhir >= this.kktpValue ? (nilaiAkhir >= 88 ? 'Tuntas (Pengayaan)' : 'Tuntas') : 'Perlu Remedial';

    const payload = {
      nama_asesmen: namaAsesmen,
      komponen_nilai: komponen,
      nilai_akhir: nilaiAkhir,
      status_ketercapaian: status
    };

    window.Storage.update('nilai', id, payload, `Edit nilai ${namaAsesmen}`);
    window.App.showToast('Nilai siswa berhasil diperbarui.');

    bootstrap.Modal.getInstance(document.getElementById('modalNilaiSingle'))?.hide();
    this.populateAsesmenFilter();
    this.renderTable();
    this.renderAnalisis();
  },

  delete(id) {
    window.App.confirmModal(
      'Hapus Nilai',
      'Apakah Anda yakin ingin menghapus data nilai sumatif ini?',
      () => {
        window.Storage.delete('nilai', id, 'Menghapus data nilai sumatif');
        this.selectedIds.delete(id);
        this.updateSelectionUI();
        window.App.showToast('Data nilai berhasil dihapus.');
        this.populateAsesmenFilter();
        this.renderTable();
        this.renderAnalisis();
      }
    );
  },

  /* --------------------------------------------------------------------------
     Export CSV
     -------------------------------------------------------------------------- */
  exportCSV() {
    const nilais = this.getFilteredNilaiList();
    this.exportDataListToCSV(nilais, `rekap_nilai_sumatif_${new Date().toISOString().slice(0, 10)}`);
  },

  exportDataListToCSV(dataList, filename) {
    const murids = window.Storage.getAll('murid') || [];
    const kelasList = window.Storage.getAll('kelas') || [];

    const muridMap = {};
    murids.forEach(m => { muridMap[m.id] = m; });

    const kelasMap = {};
    kelasList.forEach(k => { kelasMap[k.id] = k.nama_kelas; });

    const headers = ['No Absen', 'NIS Lokal', 'Nama Murid', 'Kelas', 'Nama Asesmen', 'Komponen Nilai', 'Nilai Akhir Total', 'KKTP', 'Status Ketuntasan'];
    const rows = dataList.map((n, idx) => {
      const m = muridMap[n.murid_id] || {};
      const na = Number(n.nilai_akhir) || 0;
      const status = na < this.kktpValue ? 'Perlu Remedial' : (na >= 88 ? 'Tuntas (Pengayaan)' : 'Tuntas');
      
      let rincianStr = '';
      if (n.komponen_nilai) {
        rincianStr = Object.entries(n.komponen_nilai).map(([k, v]) => `${k}:${v}`).join('; ');
      } else {
        rincianStr = `NH:${n.nilai_harian || 0}; SAS:${n.nilai_akhir_semester || 0}`;
      }

      return [
        m.no_absen || idx + 1,
        m.nis_lokal || '',
        m.nama || '',
        kelasMap[m.kelas_id || n.kelas_id] || '',
        n.nama_asesmen || '',
        rincianStr,
        na,
        this.kktpValue,
        status
      ];
    });

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

        const allMurid = window.Storage.getAll('murid') || [];
        let count = 0;

        parsed.data.forEach(row => {
          const identifier = (row[1] || row[2] || '').trim().toLowerCase();
          const asesmen = (row[4] || 'Sumatif Bab').trim();
          const nh = parseFloat(row[5]) || 0;
          const na = parseFloat(row[6]) || 0;
          const finalVal = parseFloat(row[7]) || ((nh + na) / 2);

          const targetMurid = allMurid.find(m => 
            (m.nis_lokal && m.nis_lokal.toLowerCase() === identifier) ||
            (m.nama && m.nama.toLowerCase() === identifier)
          );

          if (targetMurid && asesmen) {
            window.Storage.insert('nilai', {
              murid_id: targetMurid.id,
              kelas_id: targetMurid.kelas_id,
              nama_asesmen: asesmen,
              komponen_nilai: { 'Nilai Harian': nh, 'Nilai Akhir': na },
              nilai_harian: nh,
              nilai_akhir_semester: na,
              nilai_akhir: finalVal,
              kktp: this.kktpValue,
              status_ketercapaian: finalVal >= this.kktpValue ? 'Tuntas' : 'Perlu Remedial'
            });
            count++;
          }
        });

        window.Storage.logActivity(`Import ${count} data nilai sumatif via CSV`);
        window.App.showToast(`Berhasil mengimpor ${count} data nilai sumatif.`, 'success');
        this.populateAsesmenFilter();
        this.renderTable();
        this.renderAnalisis();
      } catch (err) {
        window.App.showToast('Gagal import nilai CSV: ' + err.message, 'danger');
      } finally {
        event.target.value = '';
      }
    };
    reader.readAsText(file);
  }
};

window.Nilai = Nilai;
