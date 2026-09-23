Rencana Pemrograman Dasar — Aplikasi Administrasi Guru
1. Ringkasan Aplikasi
Aplikasi web untuk membantu guru mengelola administrasi kelas: data murid, kehadiran, jurnal pembelajaran harian, nilai sumatif, dan pencetakan laporan.

Tech stack

Frontend: HTML5, CSS, JavaScript, Bootstrap
Backend/penyimpanan data: repository GitHub (data disimpan sebagai file, diakses lewat GitHub API)
2. Alur Aplikasi (App Flow)
Halaman Login

Login Berhasil

Menu Dasbor

Input Data Master Murid

Input Kehadiran Murid

Input Jurnal Pembelajaran

Input Rekap Nilai Sumatif Murid

Cetak Laporan

3. Daftar Halaman
No	Halaman	Fungsi Utama
1	Login (terpisah)	Masuk, daftar akun (guru), lupa sandi
2	Dasbor	Ringkasan data & jalan pintas ke menu lain
3	Data Master Murid	Kelola kelas & data murid
4	Kehadiran Murid	Rekap hadir/sakit/izin/alpa
5	Jurnal Pembelajaran	Rekap jurnal harian guru
6	Rekap Nilai Sumatif Murid	Input & analisis nilai
7	Laporan	Cetak laporan dari data rekap
8	Pengaturan	Profil madrasah, guru, kepala madrasah, akun, backup/restore
9	Verifikasi Akun Guru (khusus Admin)	Verifikasi akun guru baru; tambah, edit, update, hapus user
4. Fitur Inti (berlaku di seluruh menu data)
CRUD — tambah, lihat, ubah, hapus data
Import/Export — via template CSV
Backup/Restore — data
Login & Role — dua role: Guru dan Admin; akun guru baru berstatus "menunggu verifikasi" sampai disetujui admin
Histori Log — pencatatan aktivitas pengguna
5. Spesifikasi per Halaman
5.1 Halaman Login
Masuk: username/email + sandi (untuk role Guru maupun Admin)
Daftar akun (Guru): email, sandi, konfirmasi sandi, nama, jabatan, mata pelajaran, pangkat/golongan, NIP — akun baru berstatus "menunggu verifikasi" dan belum bisa login sampai disetujui Admin
Lupa sandi: reset sandi tanpa verifikasi email (tidak ada lagi kode OTP)
Akun Admin default: username admin, password 123456 (disarankan wajib diganti setelah login pertama)
5.2 Data Master
Kelola kelas: tambah / kurang / edit
Kelola murid: nomor absen, NIS lokal, nama murid, kelas
Import/export CSV untuk kelas & murid
Filter dan sort per kelas
5.3 Rekap Kehadiran Murid
Status: hadir, sakit, izin, alpa
Rekap: harian, bulanan, semester
Menampilkan persentase kehadiran
Import/export CSV; filter per kelas; sort per bulan/triwulan/tahun
5.4 Jurnal Guru Harian
Kolom: no, tanggal, kelas, tujuan pembelajaran, ketercapaian, jumlah siswa hadir, catatan
Import/export CSV; filter per kelas; sort per bulan/triwulan/tahun
5.5 Rekap Nilai Sumatif Murid
Input: nama asesmen, nilai sumatif harian, nilai sumatif akhir semester/tahun
Nilai akhir dihitung otomatis
Analisis: rata-rata kelas, nilai tertinggi & terendah, persentase ketercapaian
Daftar murid yang perlu remedial/pengayaan sesuai KKTP (KKTP dapat diatur)
Import/export CSV; filter per kelas; sort per bulan/triwulan/tahun
5.6 Cetak Laporan
Sumber: rekap absensi, jurnal harian, rekap nilai
Pengaturan tempat & tanggal tandatangan
Kolom kosong untuk TTD guru mata pelajaran & kepala madrasah
Template laporan (header & body) dapat diedit manual sebelum dicetak
5.7 Pengaturan
Profil madrasah: nama, alamat, no. telp, email, logo
Profil kepala madrasah: nama, jabatan, pangkat/golongan, NIP
Profil guru: nama, jabatan, pangkat/golongan, NIP, mata pelajaran
Tahun pelajaran & semester
Pengelolaan akun: ubah sandi & email
Riwayat log, backup/restore data, keluar
5.8 Verifikasi Akun Guru (khusus role Admin)
Daftar akun guru yang mendaftar, dengan status: menunggu verifikasi / terverifikasi / nonaktif
Admin dapat menyetujui/verifikasi akun guru baru agar bisa login
Admin dapat menambah user guru baru secara manual
Admin dapat mengedit/mengupdate data akun guru
Admin dapat menghapus (remove) akun guru
6. Struktur Data (Entitas Dasar)
Entitas	Field Utama
User	id, nama, email/username, sandi (hash), role (admin/guru), status (menunggu_verifikasi/terverifikasi/nonaktif), jabatan, mata pelajaran, pangkat/golongan, NIP
Kelas	id, nama_kelas
Murid	id, no_absen, nis_lokal, nama, kelas_id
Kehadiran	id, tanggal, murid_id, status (hadir/sakit/izin/alpa), catatan
Jurnal	id, tanggal, kelas_id, tujuan_pembelajaran, ketercapaian, jumlah_hadir, catatan
Nilai	id, murid_id, nama_asesmen, nilai_harian, nilai_akhir_semester, nilai_akhir
Madrasah	nama, alamat, telp, email, logo
KepalaMadrasah	nama, jabatan, pangkat/golongan, NIP
LogAktivitas	id, user_id, aksi, waktu
7. Struktur Folder Dasar (Frontend)
/administrasi-guru
├── index.html          # halaman login
├── dashboard.html
├── data-master.html
├── kehadiran.html
├── jurnal.html
├── nilai.html
├── laporan.html
├── pengaturan.html
├── verifikasi-akun.html # khusus admin
├── /css
│   └── style.css
├── /js
│   ├── auth.js          # login, daftar akun (status pending), lupa sandi
│   ├── github-api.js    # koneksi baca/tulis data ke repo GitHub
│   ├── data-master.js
│   ├── kehadiran.js
│   ├── jurnal.js
│   ├── nilai.js
│   ├── laporan.js
│   ├── pengaturan.js
│   └── verifikasi-akun.js  # CRUD user & verifikasi akun (admin)
└── /data                # file JSON sebagai "database" di GitHub
    ├── user.json         # termasuk akun admin default (admin/123456)
    ├── murid.json
    ├── kelas.json
    ├── kehadiran.json
    ├── jurnal.json
    ├── nilai.json
    └── log.json
Catatan teknis: karena backend berupa repository GitHub, data disarankan disimpan sebagai file JSON per entitas dan diakses/diubah lewat GitHub REST API (butuh Personal Access Token). Tidak ada lagi kebutuhan layanan pengiriman email untuk verifikasi — verifikasi akun guru baru sepenuhnya dilakukan manual oleh Admin lewat menu Verifikasi Akun Guru.

8. Tahapan Pengembangan (Rencana Dasar)
Tahap 1 — Fondasi: setup repo GitHub, struktur folder, desain UI dasar dengan Bootstrap
Tahap 2 — Autentikasi & Role: halaman login, daftar akun guru (status pending), lupa sandi, akun admin default (admin/123456), menu Verifikasi Akun Guru untuk admin
Tahap 3 — Data Master: CRUD kelas & murid + import/export CSV
Tahap 4 — Kehadiran: input & rekap kehadiran + perhitungan persentase
Tahap 5 — Jurnal: CRUD jurnal harian, sinkron jumlah hadir dari data kehadiran
Tahap 6 — Nilai: input nilai, perhitungan otomatis, analisis kelas
Tahap 7 — Laporan: template cetak, pengaturan tanda tangan, export ke PDF/print
Tahap 8 — Pengaturan & Penyempurnaan: profil madrasah/guru, histori log, backup/restore, uji coba menyeluruh