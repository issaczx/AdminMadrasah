/**
 * laporan.js
 * Modul pembuatan dan pencetakan laporan resmi administrasi guru:
 * Presensi, Jurnal Harian (dengan filter rentang tanggal), dan Rekap Nilai dengan Kop Surat Resmi & Tanda Tangan.
 */

const Laporan = {
  tipeLaporan: 'kehadiran', // 'kehadiran' | 'jurnal' | 'nilai'
  selectedKelas: '',
  tglMulaiJurnal: '',
  tglSelesaiJurnal: '',
  settings: {},

  init() {
    this.settings = window.Storage.getAll('madrasah') || {};
    this.parseUrlParams();
    this.populateKelasFilter();
    this.initDefaultSignatures();
    this.initDefaultDateRange();
    this.bindEvents();
    this.updateControlsVisibility();
    this.updateTitlePlaceholder();
    this.renderPreview();
  },

  parseUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const tipe = params.get('tipe');
    if (tipe && ['kehadiran', 'jurnal', 'nilai'].includes(tipe)) {
      this.tipeLaporan = tipe;
      const selectTipe = document.getElementById('laporanTipeSelect');
      if (selectTipe) selectTipe.value = tipe;
    }

    const kelas = params.get('kelas');
    if (kelas) {
      this.selectedKelas = kelas;
    }

    const start = params.get('start');
    if (start) this.tglMulaiJurnal = start;

    const end = params.get('end');
    if (end) this.tglSelesaiJurnal = end;
  },

  populateKelasFilter() {
    const kelasList = window.Storage.getAll('kelas') || [];
    const select = document.getElementById('laporanSelectKelas');
    if (!select) return;

    if (kelasList.length > 0 && !this.selectedKelas) {
      this.selectedKelas = kelasList[0].id;
    }

    select.innerHTML = kelasList.map(k => `
      <option value="${k.id}">Kelas ${k.nama_kelas}</option>
    `).join('');

    if (this.selectedKelas) {
      select.value = this.selectedKelas;
    }
  },

  initDefaultSignatures() {
    const kamad = this.settings.kepala_madrasah || {};
    const currentUser = window.Auth.getCurrentUser() || {};
    const today = new Date();

    const inpKota = document.getElementById('ttdKota');
    const inpTgl = document.getElementById('ttdTanggal');
    const inpKamadNama = document.getElementById('ttdKamadNama');
    const inpKamadNip = document.getElementById('ttdKamadNip');
    const inpGuruNama = document.getElementById('ttdGuruNama');
    const inpGuruNip = document.getElementById('ttdGuruNip');

    if (inpKota) inpKota.value = this.settings.madrasah?.kota || 'Jakarta';
    if (inpTgl) inpTgl.value = today.toISOString().slice(0, 10);
    if (inpKamadNama) inpKamadNama.value = kamad.nama || 'Dr. H. Ahmad Dahlan, M.Pd.I';
    if (inpKamadNip) inpKamadNip.value = kamad.nip || '197508152000031002';
    if (inpGuruNama) inpGuruNama.value = currentUser.nama || 'Ustadz Ahmad Fauzi, S.Pd.I';
    if (inpGuruNip) inpGuruNip.value = currentUser.nip || '198805122014021003';
  },

  initDefaultDateRange() {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

    if (!this.tglMulaiJurnal) this.tglMulaiJurnal = firstDay;
    if (!this.tglSelesaiJurnal) this.tglSelesaiJurnal = lastDay;

    const inpStart = document.getElementById('laporanTglMulai');
    const inpEnd = document.getElementById('laporanTglSelesai');

    if (inpStart) inpStart.value = this.tglMulaiJurnal;
    if (inpEnd) inpEnd.value = this.tglSelesaiJurnal;
  },

  bindEvents() {
    document.getElementById('laporanTipeSelect')?.addEventListener('change', (e) => {
      this.tipeLaporan = e.target.value;
      this.updateControlsVisibility();
      this.updateTitlePlaceholder();
      this.renderPreview();
    });

    document.getElementById('laporanSelectKelas')?.addEventListener('change', (e) => {
      this.selectedKelas = e.target.value;
      this.renderPreview();
    });

    document.getElementById('laporanTglMulai')?.addEventListener('change', (e) => {
      this.tglMulaiJurnal = e.target.value;
      this.renderPreview();
    });

    document.getElementById('laporanTglSelesai')?.addEventListener('change', (e) => {
      this.tglSelesaiJurnal = e.target.value;
      this.renderPreview();
    });

    document.getElementById('btnResetJurnalDateRange')?.addEventListener('click', () => {
      this.tglMulaiJurnal = '';
      this.tglSelesaiJurnal = '';
      const inpStart = document.getElementById('laporanTglMulai');
      const inpEnd = document.getElementById('laporanTglSelesai');
      if (inpStart) inpStart.value = '';
      if (inpEnd) inpEnd.value = '';
      this.renderPreview();
    });

    // Event listeners to refresh preview on signature edits
    ['ttdKota', 'ttdTanggal', 'ttdKamadNama', 'ttdKamadNip', 'ttdGuruNama', 'ttdGuruNip', 'laporanJudulCustom'].forEach(id => {
      document.getElementById(id)?.addEventListener('input', () => this.renderPreview());
    });

    // Print Button
    document.getElementById('btnPrintLaporan')?.addEventListener('click', () => {
      window.print();
    });
  },

  updateControlsVisibility() {
    const rangeContainer = document.getElementById('jurnalDateRangeContainer');
    if (this.tipeLaporan === 'jurnal') {
      rangeContainer?.classList.remove('d-none');
      rangeContainer?.classList.add('d-flex');
    } else {
      rangeContainer?.classList.remove('d-flex');
      rangeContainer?.classList.add('d-none');
    }
  },

  updateTitlePlaceholder() {
    const titles = {
      'kehadiran': 'LAPORAN REKAPITULASI KEHADIRAN SISWA',
      'jurnal': 'LAPORAN JURNAL PEMBELAJARAN GURU HARIAN',
      'nilai': 'LAPORAN REKAPITULASI DAN ANALISIS NILAI SUMATIF'
    };
    const inp = document.getElementById('laporanJudulCustom');
    if (inp) inp.value = titles[this.tipeLaporan] || 'LAPORAN RESMI';
  },

  renderPreview() {
    const printArea = document.getElementById('printDocumentArea');
    if (!printArea) return;

    const madrasah = this.settings.madrasah || {};
    const thn = this.settings.tahun_pelajaran || '2025/2026';
    const smt = this.settings.semester || 'Ganjil';
    const kelasObj = window.Storage.getById('kelas', this.selectedKelas) || { nama_kelas: 'Semua Kelas' };
    
    const judul = document.getElementById('laporanJudulCustom')?.value || 'LAPORAN ADMINISTRASI';
    const kota = document.getElementById('ttdKota')?.value || 'Jakarta';
    const tglTtd = document.getElementById('ttdTanggal')?.value || new Date().toISOString().slice(0, 10);
    const kamadNama = document.getElementById('ttdKamadNama')?.value || 'Kepala Madrasah';
    const kamadNip = document.getElementById('ttdKamadNip')?.value || '-';
    const guruNama = document.getElementById('ttdGuruNama')?.value || 'Guru Pengampu';
    const guruNip = document.getElementById('ttdGuruNip')?.value || '-';

    // 1. Kop Surat
    let kopLogoHtml = madrasah.logo 
      ? `<img src="${madrasah.logo}" class="kop-logo" alt="Logo">`
      : `<div class="kop-logo-placeholder"><i class="bi bi-mortarboard-fill fs-2"></i><span>KEMENAG</span></div>`;

    let kopHtml = `
      <div class="kop-surat">
        ${kopLogoHtml}
        <div class="kop-content">
          <h5>KEMENTERIAN AGAMA REPUBLIK INDONESIA</h5>
          <h3>${madrasah.nama || 'MADRASAH TSANAWIYAH NEGERI 1'}</h3>
          <p>${madrasah.alamat || 'Jl. Pendidikan Islami No. 45'}</p>
          <p class="small text-muted">Telp: ${madrasah.telp || '-'} | Email: ${madrasah.email || '-'}</p>
        </div>
      </div>
    `;

    // 2. Judul & Info (Tambahkan Keterangan Rentang Tanggal jika Jurnal)
    let extraPeriodInfo = '';
    if (this.tipeLaporan === 'jurnal') {
      if (this.tglMulaiJurnal && this.tglSelesaiJurnal) {
        extraPeriodInfo = `<span>Rentang: ${window.App.formatDate(this.tglMulaiJurnal)} s.d. ${window.App.formatDate(this.tglSelesaiJurnal)}</span>`;
      } else if (this.tglMulaiJurnal) {
        extraPeriodInfo = `<span>Mulai Tanggal: ${window.App.formatDate(this.tglMulaiJurnal)}</span>`;
      } else if (this.tglSelesaiJurnal) {
        extraPeriodInfo = `<span>Sampai Tanggal: ${window.App.formatDate(this.tglSelesaiJurnal)}</span>`;
      } else {
        extraPeriodInfo = `<span>Rentang: Seluruh Catatan</span>`;
      }
    }

    let headerInfoHtml = `
      <div class="report-title-section">
        <h4>${judul}</h4>
        <div class="d-flex justify-content-between mt-3 text-secondary small fw-bold">
          <span>Kelas: ${kelasObj.nama_kelas}</span>
          ${extraPeriodInfo}
          <span>Tahun Pelajaran: ${thn} (Semester ${smt})</span>
        </div>
      </div>
    `;

    // 3. Body Table sesuai tipe
    let tableHtml = '';
    if (this.tipeLaporan === 'kehadiran') {
      tableHtml = this.generateTableKehadiran();
    } else if (this.tipeLaporan === 'jurnal') {
      tableHtml = this.generateTableJurnal();
    } else {
      tableHtml = this.generateTableNilai();
    }

    // 4. Bagian Tanda Tangan
    const formattedTgl = window.App.formatDate(tglTtd);
    let ttdHtml = `
      <div class="report-ttd-section">
        <div class="ttd-box">
          <div>Mengetahui,</div>
          <div class="fw-bold">Kepala Madrasah</div>
          <div class="ttd-space"></div>
          <div class="ttd-name">${kamadNama}</div>
          <small class="text-muted">NIP. ${kamadNip}</small>
        </div>

        <div class="ttd-box">
          <div>${kota}, ${formattedTgl}</div>
          <div class="fw-bold">Guru Mata Pelajaran</div>
          <div class="ttd-space"></div>
          <div class="ttd-name">${guruNama}</div>
          <small class="text-muted">NIP. ${guruNip}</small>
        </div>
      </div>
    `;

    printArea.innerHTML = `
      <div class="report-paper">
        ${kopHtml}
        ${headerInfoHtml}
        ${tableHtml}
        ${ttdHtml}
      </div>
    `;
  },

  generateTableKehadiran() {
    const allMurid = window.Storage.getAll('murid') || [];
    const muridKelas = allMurid.filter(m => m.kelas_id === this.selectedKelas)
      .sort((a, b) => (parseInt(a.no_absen, 10) || 0) - (parseInt(b.no_absen, 10) || 0));

    const allKehadiran = window.Storage.getAll('kehadiran') || [];

    if (muridKelas.length === 0) {
      return '<div class="alert alert-light text-center">Tidak ada data siswa di kelas ini.</div>';
    }

    const rows = muridKelas.map((m, idx) => {
      const records = allKehadiran.filter(k => k.murid_id === m.id);
      const h = records.filter(k => k.status === 'hadir').length;
      const s = records.filter(k => k.status === 'sakit').length;
      const i = records.filter(k => k.status === 'izin').length;
      const a = records.filter(k => k.status === 'alpa').length;
      const total = h + s + i + a;
      const persen = total > 0 ? ((h / total) * 100).toFixed(1) : '100.0';

      return `
        <tr>
          <td class="text-center">${m.no_absen || idx + 1}</td>
          <td>${m.nis_lokal || '-'}</td>
          <td class="fw-bold">${m.nama}</td>
          <td class="text-center">${m.jenis_kelamin || 'L'}</td>
          <td class="text-center">${h}</td>
          <td class="text-center">${s}</td>
          <td class="text-center">${i}</td>
          <td class="text-center">${a}</td>
          <td class="text-center fw-bold">${persen}%</td>
        </tr>
      `;
    }).join('');

    return `
      <table class="table table-bordered table-sm table-custom mb-4">
        <thead class="text-center">
          <tr>
            <th rowspan="2" style="width: 40px; vertical-align: middle;">No</th>
            <th rowspan="2" style="width: 110px; vertical-align: middle;">NIS</th>
            <th rowspan="2" style="vertical-align: middle;">Nama Siswa</th>
            <th rowspan="2" style="width: 50px; vertical-align: middle;">L/P</th>
            <th colspan="4">Rekap Kehadiran</th>
            <th rowspan="2" style="width: 80px; vertical-align: middle;">% Hadir</th>
          </tr>
          <tr>
            <th style="width: 45px;">H</th>
            <th style="width: 45px;">S</th>
            <th style="width: 45px;">I</th>
            <th style="width: 45px;">A</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;
  },

  generateTableJurnal() {
    let jurnals = window.Storage.getAll('jurnal') || [];
    jurnals = jurnals.filter(j => j.kelas_id === this.selectedKelas);

    // Filter berdasarkan rentang tanggal
    if (this.tglMulaiJurnal) {
      jurnals = jurnals.filter(j => j.tanggal >= this.tglMulaiJurnal);
    }
    if (this.tglSelesaiJurnal) {
      jurnals = jurnals.filter(j => j.tanggal <= this.tglSelesaiJurnal);
    }

    jurnals.sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal));

    if (jurnals.length === 0) {
      return '<div class="alert alert-light text-center py-4">Tidak ada catatan jurnal pembelajaran untuk kelas dan rentang tanggal yang dipilih.</div>';
    }

    const rows = jurnals.map((j, idx) => `
      <tr>
        <td class="text-center">${idx + 1}</td>
        <td style="white-space: nowrap;">${window.App.formatDate(j.tanggal)}</td>
        <td>${j.tujuan_pembelajaran}</td>
        <td>${j.ketercapaian || '-'}</td>
        <td class="text-center fw-bold">${j.jumlah_hadir || 0}</td>
        <td>${j.catatan || '-'}</td>
      </tr>
    `).join('');

    return `
      <table class="table table-bordered table-sm table-custom mb-4">
        <thead class="text-center">
          <tr>
            <th style="width: 40px;">No</th>
            <th style="width: 120px;">Hari/Tanggal</th>
            <th>Tujuan Pembelajaran / Materi</th>
            <th style="width: 180px;">Ketercapaian</th>
            <th style="width: 70px;">Hadir</th>
            <th style="width: 220px;">Catatan / Refleksi</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;
  },

  generateTableNilai() {
    const allMurid = window.Storage.getAll('murid') || [];
    const muridKelas = allMurid.filter(m => m.kelas_id === this.selectedKelas)
      .sort((a, b) => (parseInt(a.no_absen, 10) || 0) - (parseInt(b.no_absen, 10) || 0));

    const allNilai = window.Storage.getAll('nilai') || [];
    const kktp = Number(this.settings.kktp_default || 75);

    if (muridKelas.length === 0) {
      return '<div class="alert alert-light text-center">Tidak ada siswa di kelas ini.</div>';
    }

    const rows = muridKelas.map((m, idx) => {
      const records = allNilai.filter(n => n.murid_id === m.id);
      
      let na = 0;
      let status = 'Belum Dinilai';
      let rincianKomponen = '-';

      if (records.length > 0) {
        const lastRec = records[0];
        na = Number(lastRec.nilai_akhir) || 0;
        status = na >= kktp ? 'Tuntas' : 'Perlu Remedial';
        if (lastRec.komponen_nilai) {
          rincianKomponen = Object.entries(lastRec.komponen_nilai)
            .map(([k, v]) => `${k}:${v}`)
            .join(', ');
        } else {
          rincianKomponen = `NH:${lastRec.nilai_harian || '-'}, SAS:${lastRec.nilai_akhir_semester || '-'}`;
        }
      }

      return `
        <tr>
          <td class="text-center">${m.no_absen || idx + 1}</td>
          <td>${m.nis_lokal || '-'}</td>
          <td class="fw-bold">${m.nama}</td>
          <td class="text-center small">${rincianKomponen}</td>
          <td class="text-center fw-bold fs-6 ${records.length > 0 && na < kktp ? 'text-danger' : ''}">${records.length > 0 ? na : '-'}</td>
          <td class="text-center">${kktp}</td>
          <td class="text-center ${na < kktp && records.length > 0 ? 'text-danger fw-bold' : ''}">
            ${records.length > 0 ? status : 'Belum Dinilai'}
          </td>
        </tr>
      `;
    }).join('');

    return `
      <table class="table table-bordered table-sm table-custom mb-4">
        <thead class="text-center">
          <tr>
            <th style="width: 40px;">No</th>
            <th style="width: 110px;">NIS</th>
            <th>Nama Lengkap Siswa</th>
            <th style="width: 200px;">Rincian Komponen Nilai</th>
            <th style="width: 90px;">Nilai Akhir</th>
            <th style="width: 60px;">KKTP</th>
            <th style="width: 130px;">Keterangan</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;
  }
};

window.Laporan = Laporan;
