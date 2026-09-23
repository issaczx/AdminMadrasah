/**
 * kehadiran.js
 * Modul manajemen presensi harian murid dan rekapitulasi persentase kehadiran.
 */

const Kehadiran = {
  selectedKelas: '',
  selectedTanggal: new Date().toISOString().slice(0, 10),
  activeView: 'input', // 'input' | 'rekap'
  rekapBulan: new Date().getMonth() + 1, // 1 - 12
  rekapTahun: new Date().getFullYear(),

  init() {
    this.bindEvents();
    this.populateKelasOptions();
    
    // Set default tanggal hari ini di UI
    const inputTgl = document.getElementById('inputTglPresensi');
    if (inputTgl) inputTgl.value = this.selectedTanggal;

    const selectBulan = document.getElementById('filterRekapBulan');
    if (selectBulan) selectBulan.value = String(this.rekapBulan);

    this.renderView();
  },

  bindEvents() {
    // Switch Tabs
    document.getElementById('tab-input-presensi')?.addEventListener('click', () => {
      this.activeView = 'input';
      this.renderView();
    });

    document.getElementById('tab-rekap-presensi')?.addEventListener('click', () => {
      this.activeView = 'rekap';
      this.renderView();
    });

    // Filter Kelas
    document.getElementById('selectKelasPresensi')?.addEventListener('change', (e) => {
      this.selectedKelas = e.target.value;
      this.renderView();
    });

    // Ubah Tanggal Input
    document.getElementById('inputTglPresensi')?.addEventListener('change', (e) => {
      this.selectedTanggal = e.target.value;
      this.renderInputPresensi();
    });

    // Form Presensi Submit
    document.getElementById('formInputPresensi')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.savePresensi();
    });

    // Tombol Set Semua Hadir
    document.getElementById('btnSetAllHadir')?.addEventListener('click', () => {
      this.setAllHadir();
    });

    // Filter Rekap Bulan / Tahun
    document.getElementById('filterRekapBulan')?.addEventListener('change', (e) => {
      this.rekapBulan = parseInt(e.target.value, 10);
      this.renderRekapPresensi();
    });

    document.getElementById('filterRekapTahun')?.addEventListener('change', (e) => {
      this.rekapTahun = parseInt(e.target.value, 10);
      this.renderRekapPresensi();
    });

    // Export CSV
    document.getElementById('btnExportKehadiranCSV')?.addEventListener('click', () => {
      this.exportCSV();
    });

    // Import CSV
    document.getElementById('inputImportKehadiranCSV')?.addEventListener('change', (e) => {
      this.handleImportCSV(e);
    });
  },

  populateKelasOptions() {
    const kelasList = window.Storage.getAll('kelas') || [];
    const select = document.getElementById('selectKelasPresensi');
    if (!select) return;

    if (kelasList.length > 0 && !this.selectedKelas) {
      this.selectedKelas = kelasList[0].id;
    }

    select.innerHTML = kelasList.map(k => `
      <option value="${k.id}">${k.nama_kelas} (${k.wali_kelas || 'Wali -'})</option>
    `).join('');

    if (this.selectedKelas) {
      select.value = this.selectedKelas;
    }
  },

  renderView() {
    if (this.activeView === 'input') {
      document.getElementById('viewInputPresensi').classList.remove('d-none');
      document.getElementById('viewRekapPresensi').classList.add('d-none');
      this.renderInputPresensi();
    } else {
      document.getElementById('viewInputPresensi').classList.add('d-none');
      document.getElementById('viewRekapPresensi').classList.remove('d-none');
      this.renderRekapPresensi();
    }
  },

  // -------------------------------------------------------------
  // INPUT PRESENSI HARIAN
  // -------------------------------------------------------------
  renderInputPresensi() {
    const container = document.getElementById('tableInputPresensiBody');
    if (!container) return;

    const allMurid = window.Storage.getAll('murid') || [];
    const muridKelas = allMurid.filter(m => m.kelas_id === this.selectedKelas)
      .sort((a, b) => (parseInt(a.no_absen, 10) || 0) - (parseInt(b.no_absen, 10) || 0));

    if (muridKelas.length === 0) {
      container.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4">Tidak ada siswa terdaftar pada kelas ini.</td></tr>`;
      return;
    }

    // Ambil data presensi yang sudah tersimpan pada tanggal & kelas ini
    const allKehadiran = window.Storage.getAll('kehadiran') || [];
    const tglKehadiran = allKehadiran.filter(k => k.tanggal === this.selectedTanggal && k.kelas_id === this.selectedKelas);
    const mapKehadiran = {};
    tglKehadiran.forEach(k => { mapKehadiran[k.murid_id] = k; });

    container.innerHTML = muridKelas.map((m, idx) => {
      const existing = mapKehadiran[m.id];
      const status = existing ? existing.status : 'hadir'; // Default hadir
      const catatan = existing ? (existing.catatan || '') : '';

      return `
        <tr data-murid-id="${m.id}">
          <td class="text-center fw-bold text-muted">${m.no_absen || idx + 1}</td>
          <td>
            <div class="fw-bold text-dark">${m.nama}</div>
            <small class="text-muted">NIS: ${m.nis_lokal || '-'}</small>
          </td>
          <td class="text-center">
            <div class="btn-group btn-group-sm" role="group">
              <input type="radio" class="btn-check" name="status_${m.id}" id="h_${m.id}" value="hadir" ${status === 'hadir' ? 'checked' : ''}>
              <label class="btn btn-outline-success px-3" for="h_${m.id}">H</label>

              <input type="radio" class="btn-check" name="status_${m.id}" id="s_${m.id}" value="sakit" ${status === 'sakit' ? 'checked' : ''}>
              <label class="btn btn-outline-primary px-3" for="s_${m.id}">S</label>

              <input type="radio" class="btn-check" name="status_${m.id}" id="i_${m.id}" value="izin" ${status === 'izin' ? 'checked' : ''}>
              <label class="btn btn-outline-warning px-3" for="i_${m.id}">I</label>

              <input type="radio" class="btn-check" name="status_${m.id}" id="a_${m.id}" value="alpa" ${status === 'alpa' ? 'checked' : ''}>
              <label class="btn btn-outline-danger px-3" for="a_${m.id}">A</label>
            </div>
          </td>
          <td>
            <input type="text" class="form-control form-control-sm catatan-input" value="${catatan}" placeholder="Keterangan / alasan...">
          </td>
        </tr>
      `;
    }).join('');
  },

  setAllHadir() {
    const rows = document.querySelectorAll('#tableInputPresensiBody tr');
    rows.forEach(row => {
      const muridId = row.getAttribute('data-murid-id');
      const radioHadir = document.getElementById(`h_${muridId}`);
      if (radioHadir) radioHadir.checked = true;
    });
    window.App.showToast('Semua siswa ditandai HADIR.', 'info');
  },

  savePresensi() {
    const rows = document.querySelectorAll('#tableInputPresensiBody tr');
    if (rows.length === 0) return;

    let allKehadiran = window.Storage.getAll('kehadiran') || [];
    const tanggal = this.selectedTanggal;
    const kelas_id = this.selectedKelas;

    // Hapus presensi tanggal & kelas ini terlebih dahulu untuk di-overwrite
    allKehadiran = allKehadiran.filter(k => !(k.tanggal === tanggal && k.kelas_id === kelas_id));

    let countH = 0, countS = 0, countI = 0, countA = 0;

    rows.forEach(row => {
      const murid_id = row.getAttribute('data-murid-id');
      if (!murid_id) return;

      const checkedRadio = row.querySelector(`input[name="status_${murid_id}"]:checked`);
      const status = checkedRadio ? checkedRadio.value : 'hadir';
      const catatan = row.querySelector('.catatan-input')?.value.trim() || '';

      if (status === 'hadir') countH++;
      else if (status === 'sakit') countS++;
      else if (status === 'izin') countI++;
      else if (status === 'alpa') countA++;

      allKehadiran.push({
        id: 'khd-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
        tanggal: tanggal,
        kelas_id: kelas_id,
        murid_id: murid_id,
        status: status,
        catatan: catatan
      });
    });

    window.Storage.setAll('kehadiran', allKehadiran);
    
    const kelasObj = window.Storage.getById('kelas', kelas_id);
    const namaKelas = kelasObj ? kelasObj.nama_kelas : '';
    window.Storage.logActivity(`Simpan presensi kelas ${namaKelas} tanggal ${tanggal} (Hadir: ${countH}, Sakit: ${countS}, Izin: ${countI}, Alpa: ${countA})`);

    window.App.showToast(`Presensi kelas ${namaKelas} berhasil disimpan!`, 'success');
  },

  // -------------------------------------------------------------
  // REKAPITULASI PRESENSI
  // -------------------------------------------------------------
  renderRekapPresensi() {
    const container = document.getElementById('tableRekapPresensiBody');
    if (!container) return;

    const allMurid = window.Storage.getAll('murid') || [];
    const muridKelas = allMurid.filter(m => m.kelas_id === this.selectedKelas)
      .sort((a, b) => (parseInt(a.no_absen, 10) || 0) - (parseInt(b.no_absen, 10) || 0));

    if (muridKelas.length === 0) {
      container.innerHTML = `<tr><td colspan="9" class="text-center text-muted py-4">Tidak ada siswa terdaftar pada kelas ini.</td></tr>`;
      return;
    }

    const allKehadiran = window.Storage.getAll('kehadiran') || [];
    
    // Filter kehadiran per kelas, bulan, tahun
    const filteredKehadiran = allKehadiran.filter(k => {
      if (k.kelas_id !== this.selectedKelas) return false;
      if (!k.tanggal) return false;
      const d = new Date(k.tanggal);
      if (this.rekapBulan !== 0 && (d.getMonth() + 1) !== this.rekapBulan) return false;
      if (this.rekapTahun && d.getFullYear() !== this.rekapTahun) return false;
      return true;
    });

    let totalHadirSemua = 0, totalSemuaPertemuan = 0;

    container.innerHTML = muridKelas.map((m, idx) => {
      const records = filteredKehadiran.filter(k => k.murid_id === m.id);
      const h = records.filter(k => k.status === 'hadir').length;
      const s = records.filter(k => k.status === 'sakit').length;
      const i = records.filter(k => k.status === 'izin').length;
      const a = records.filter(k => k.status === 'alpa').length;
      const total = h + s + i + a;

      totalHadirSemua += h;
      totalSemuaPertemuan += total;

      const persen = total > 0 ? ((h / total) * 100).toFixed(1) : '100.0';
      const persenNum = parseFloat(persen);

      let badgeClass = 'bg-success';
      if (persenNum < 75) badgeClass = 'bg-danger';
      else if (persenNum < 85) badgeClass = 'bg-warning text-dark';

      return `
        <tr>
          <td class="text-center fw-bold text-muted">${m.no_absen || idx + 1}</td>
          <td>
            <div class="fw-bold text-dark">${m.nama}</div>
            <small class="text-muted">NIS: ${m.nis_lokal || '-'}</small>
          </td>
          <td class="text-center fw-bold text-success">${h}</td>
          <td class="text-center fw-bold text-primary">${s}</td>
          <td class="text-center fw-bold text-warning">${i}</td>
          <td class="text-center fw-bold text-danger">${a}</td>
          <td class="text-center fw-bold">${total}</td>
          <td class="text-center">
            <span class="badge ${badgeClass} px-2 py-1">${persen}%</span>
          </td>
        </tr>
      `;
    }).join('');

    // Summary Card
    const avgPersen = totalSemuaPertemuan > 0 ? ((totalHadirSemua / totalSemuaPertemuan) * 100).toFixed(1) : '100.0';
    document.getElementById('rekapSummaryBadge').innerText = `Rata-rata Kehadiran Kelas: ${avgPersen}%`;
  },

  // -------------------------------------------------------------
  // CSV IMPORT & EXPORT KEHADIRAN
  // -------------------------------------------------------------
  exportCSV() {
    const allMurid = window.Storage.getAll('murid') || [];
    const muridKelas = allMurid.filter(m => m.kelas_id === this.selectedKelas);
    const allKehadiran = window.Storage.getAll('kehadiran') || [];
    const kelasObj = window.Storage.getById('kelas', this.selectedKelas);
    const namaKelas = kelasObj ? kelasObj.nama_kelas : 'kelas';

    const headers = ['No Absen', 'NIS Lokal', 'Nama Murid', 'Kelas', 'Hadir (H)', 'Sakit (S)', 'Izin (I)', 'Alpa (A)', 'Total Pertemuan', 'Persentase (%)'];
    
    const rows = muridKelas.map((m, idx) => {
      const records = allKehadiran.filter(k => {
        if (k.murid_id !== m.id) return false;
        if (this.rekapBulan !== 0) {
          const d = new Date(k.tanggal);
          if ((d.getMonth() + 1) !== this.rekapBulan || d.getFullYear() !== this.rekapTahun) return false;
        }
        return true;
      });

      const h = records.filter(k => k.status === 'hadir').length;
      const s = records.filter(k => k.status === 'sakit').length;
      const i = records.filter(k => k.status === 'izin').length;
      const a = records.filter(k => k.status === 'alpa').length;
      const total = h + s + i + a;
      const persen = total > 0 ? ((h / total) * 100).toFixed(1) : '100.0';

      return [
        m.no_absen || idx + 1,
        m.nis_lokal || '',
        m.nama || '',
        namaKelas,
        h, s, i, a, total, persen + '%'
      ];
    });

    const filename = `rekap_kehadiran_${namaKelas}_bulan_${this.rekapBulan}_${this.rekapTahun}`;
    window.App.exportToCSV(filename, headers, rows);
    window.App.showToast('Data rekapitulasi kehadiran berhasil diekspor.');
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

        // Format import presensi log harian: [Tanggal(YYYY-MM-DD), NIS/Nama, Kelas, Status(H/S/I/A), Catatan]
        const allMurid = window.Storage.getAll('murid') || [];
        const allKelas = window.Storage.getAll('kelas') || [];
        let count = 0;

        parsed.data.forEach(row => {
          const tanggal = (row[0] || '').trim();
          const identifier = (row[1] || '').trim().toLowerCase();
          const namaKelas = (row[2] || '').trim().toLowerCase();
          const rawStatus = (row[3] || 'hadir').trim().toLowerCase();
          const catatan = (row[4] || '').trim();

          let status = 'hadir';
          if (rawStatus.startsWith('s')) status = 'sakit';
          else if (rawStatus.startsWith('i')) status = 'izin';
          else if (rawStatus.startsWith('a')) status = 'alpa';

          // Match student
          const targetMurid = allMurid.find(m => 
            (m.nis_lokal && m.nis_lokal.toLowerCase() === identifier) ||
            (m.nama && m.nama.toLowerCase() === identifier)
          );

          if (targetMurid && tanggal) {
            window.Storage.insert('kehadiran', {
              tanggal: tanggal,
              kelas_id: targetMurid.kelas_id,
              murid_id: targetMurid.id,
              status: status,
              catatan: catatan
            });
            count++;
          }
        });

        window.Storage.logActivity(`Import ${count} data presensi via CSV`);
        window.App.showToast(`Berhasil mengimpor ${count} data presensi.`, 'success');
        this.renderView();
      } catch (err) {
        window.App.showToast('Gagal import CSV kehadiran: ' + err.message, 'danger');
      } finally {
        event.target.value = '';
      }
    };
    reader.readAsText(file);
  }
};

window.Kehadiran = Kehadiran;
