# SIM Administrasi Madrasah (Web App)

Aplikasi Web modern, responsif, dan komprehensif untuk membantu Guru dan Administrator Madrasah dalam mengelola seluruh administrasi kelas, data master siswa, presensi harian & rekapitulasi persentase, jurnal pembelajaran guru, rekapitulasi & analisis nilai sumatif (KKTP/Remedial), pencetakan laporan resmi dengan kop surat, verifikasi akun guru baru, serta integrasi backend database file JSON ke GitHub Repository via REST API.

---

## 🚀 Fitur Utama

1. **Autentikasi & Multi-Role**:
   - Role **Administrator** dan **Guru**.
   - Pendaftaran Guru baru dengan status awal `Menunggu Verifikasi` (belum dapat login sebelum disetujui Admin).
   - Akun Admin default: `admin` / `123456`.
   - Reset sandi langsung (*tanpa OTP email*).

2. **Dasbor Statistik & Visualisasi**:
   - Kartu statistik: Total Murid, Jumlah Rombel, Tingkat Kehadiran, dan Rata-rata Nilai.
   - Grafik interaktif distribusi absensi (Hadir, Sakit, Izin, Alpa) via Chart.js.
   - Shortcut aksi cepat & ringkasan audit log aktivitas terbaru.

3. **Data Master (Kelas & Murid)**:
   - CRUD Rombongan Belajar (Kelas).
   - CRUD Data Murid (No Absen, NIS Lokal, Nama, Kelas, Jenis Kelamin).
   - **Fitur Selection Data Massal**: Multi-select checkbox untuk Hapus Massal, Pindah Kelas Massal, dan Ekspor Terpilih.
   - Filter kelas, pencarian real-time, sorting.
   - **Import & Export CSV** data murid dan kelas + tombol Unduh Template CSV.

4. **Rekap Kehadiran Murid**:
   - Form input presensi harian per kelas (Hadir, Sakit, Izin, Alpa, Catatan) + tombol "Set Semua Hadir".
   - Rekapitulasi bulanan & semester dengan kalkulasi persentase kehadiran (%) otomatis.
   - Penandaan warna indikator kehadiran (Hijau >85%, Kuning 75-85%, Merah <75%).
   - Import & Export CSV Rekap Presensi.

5. **Jurnal Pembelajaran Guru Harian**:
   - Pencatatan No, Tanggal, Kelas, Tujuan Pembelajaran / Materi, Ketercapaian, Jumlah Siswa Hadir, dan Catatan / Refleksi.
   - **Fitur Selection Data Massal**: Multi-select checkbox untuk Hapus Terpilih dan Ekspor Terpilih.
   - **Sinkronisasi Otomatis**: Jumlah hadir otomatis ditarik dari data presensi di tanggal & kelas bersangkutan.
   - Filter kelas, bulan, dan tahun + Export CSV.

6. **Rekap Nilai Sumatif & Input Nilai Tabel Dinamis (Spreadsheet)**:
   - **Input Nilai Berbasis Tabel Kelas**: Input nilai seluruh siswa sekelas dalam satu lembar tabel sekaligus.
   - **Dinamis Tambah Kolom Penilaian**: Bebas menambah/menghapus kolom penilaian kustom (TP 1, TP 2, Tugas, UH, STS, SAS, dll) atau memakai preset cepat.
   - **Kalkulasi Otomatis Real-time** Nilai Akhir & Penentuan status **KKTP** (Remedial / Pengayaan).
   - **Fitur Selection Data Massal**: Checkbox multi-select untuk Hapus Terpilih dan Ekspor Terpilih CSV.
   - Analisis statistik: Rata-rata kelas, nilai tertinggi & terendah, persentase ketuntasan.

7. **Pusat Cetak Laporan Resmi**:
   - Cetak Laporan Presensi, Jurnal Mengajar, dan Nilai Sumatif.
   - **Cetak Jurnal dengan Rentang Tanggal**: Memilih tanggal awal s.d. tanggal akhir jurnal yang akan dicetak dengan keterangan periode otomatis di kop dokumen.
   - Kop Surat Resmi Madrasah / Kemenag standar.
   - Pengaturan tempat, tanggal tanda tangan, nama & NIP Kepala Madrasah serta Guru Pengampu.
   - Teks judul laporan dan data dapat diedit sebelum dicetak.
   - *Print stylesheet* rapi dan siap simpan ke PDF.

8. **Verifikasi Akun Guru (Khusus Admin)**:
   - Panel persetujuan pendaftaran guru baru (`Menunggu Verifikasi` -> `Terverifikasi`).
   - **Aksi Massal Akun**: Multi-select untuk Setujui Massal, Nonaktifkan Massal, dan Hapus Massal.
   - Aktivasi / nonaktivasi akun guru.
   - Tambah guru baru secara manual, edit data guru, dan hapus akun.

9. **Pengaturan & Backend Storage GitHub REST API**:
   - Profil Madrasah (Nama, Alamat, Kontak, NSM, NPSN, Logo).
   - Profil Kepala Madrasah & Profil Akun Pengguna saat ini.
   - Pengaturan Tahun Pelajaran & Semester aktif.
   - Ubah Kata Sandi Akun.
   - **Konfigurasi GitHub REST API**: Hubungkan Owner, Repo, Branch, dan Personal Access Token (PAT) untuk penyimpanan permanen ke file JSON di repo GitHub.
   - **Backup & Restore**: Cadangkan seluruh database ke file JSON & Pulihkan sewaktu-waktu.
   - **Audit Log**: Pemantauan histori aktivitas pengguna lengkap.

---

## 💻 Cara Menjalankan Aplikasi

### Opsi 1: Menggunakan Launcher `start_app.bat` (Windows)
Cukup klik ganda pada file `start_app.bat`. Browser akan otomatis membuka `http://localhost:8080/index.html`.

### Opsi 2: Menggunakan PowerShell Server
Buka terminal PowerShell pada direktori proyek, lalu jalankan:
```powershell
powershell -ExecutionPolicy Bypass -File .\server.ps1 -Port 8080
```
Buka browser pada: [http://localhost:8080/index.html](http://localhost:8080/index.html)

---

## 🔑 Kredensial Default

| Role | Username | Password | Status |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin` | `123456` | Terverifikasi |
| **Guru (Contoh)** | `ahmad.fauzi` | `123456` | Terverifikasi |
| **Guru Baru (Uji Verifikasi)** | `siti.aminah` | `123456` | Menunggu Verifikasi |
