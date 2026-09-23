/**
 * auth.js
 * Modul autentikasi, otorisasi role, pendaftaran akun guru, dan reset password.
 */

const SESSION_KEY = 'madrasah_session';

const Auth = {
  // Hash SHA-256 menggunakan Web Crypto API
  async hashPassword(password) {
    if (!password) return '';
    // Jika string sudah berformat hex 64 karakter (sudah sha256), return langsung
    if (/^[a-f0-9]{64}$/i.test(password)) return password;
    
    try {
      const msgBuffer = new TextEncoder().encode(password);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
      // Fallback sederhana jika crypto.subtle tidak tersedia
      console.warn('Crypto subtle fallback:', e);
      let hash = 0;
      for (let i = 0; i < password.length; i++) {
        hash = (hash << 5) - hash + password.charCodeAt(i);
        hash |= 0;
      }
      return 'fb_' + Math.abs(hash).toString(16);
    }
  },

  getCurrentUser() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  },

  setCurrentUser(user) {
    // Jangan simpan password hash di session browser
    const cleanUser = { ...user };
    delete cleanUser.passwordHash;
    delete cleanUser.password;
    localStorage.setItem(SESSION_KEY, JSON.stringify(cleanUser));
  },

  logout() {
    const user = this.getCurrentUser();
    if (user && window.Storage) {
      window.Storage.logActivity(`User ${user.nama} (${user.username}) keluar (logout)`);
    }
    localStorage.removeItem(SESSION_KEY);
    window.location.href = 'index.html';
  },

  async login(identifier, plainPassword) {
    await window.Storage.init();
    const users = window.Storage.getAll('user');
    const inputHash = await this.hashPassword(plainPassword);

    const cleanIdentifier = (identifier || '').trim().toLowerCase();
    
    // Cari user berdasarkan username ATAU email
    const foundUser = users.find(u => 
      (u.username && u.username.toLowerCase() === cleanIdentifier) ||
      (u.email && u.email.toLowerCase() === cleanIdentifier)
    );

    if (!foundUser) {
      throw new Error('Username atau Email tidak ditemukan.');
    }

    // Cek password hash atau plain fallback (untuk kompatibilitas)
    const userHash = foundUser.passwordHash || (foundUser.password ? await this.hashPassword(foundUser.password) : '');
    if (userHash !== inputHash && foundUser.password !== plainPassword) {
      throw new Error('Kata sandi yang Anda masukkan salah.');
    }

    // Cek Status Akun
    if (foundUser.status === 'menunggu_verifikasi') {
      throw new Error('Akun Anda masih berstatus MENUNGGU VERIFIKASI. Silakan hubungi Admin Madrasah untuk persetujuan aktivasi akun.');
    }

    if (foundUser.status === 'nonaktif') {
      throw new Error('Akun Anda dinonaktifkan oleh Administrator. Hubungi pihak sekolah untuk informasi lebih lanjut.');
    }

    // Berhasil Login
    this.setCurrentUser(foundUser);
    window.Storage.logActivity(`User ${foundUser.nama} (${foundUser.role}) berhasil masuk ke sistem`);
    
    return foundUser;
  },

  async register(userData) {
    await window.Storage.init();
    const users = window.Storage.getAll('user');

    const email = (userData.email || '').trim().toLowerCase();
    const username = (userData.username || email.split('@')[0] || '').trim().toLowerCase();

    // Validasi duplikasi
    const existing = users.find(u => 
      u.email.toLowerCase() === email || 
      (u.username && u.username.toLowerCase() === username)
    );

    if (existing) {
      throw new Error('Email atau Username sudah terdaftar di sistem.');
    }

    const passwordHash = await this.hashPassword(userData.password);

    const newUser = {
      id: 'usr-guru-' + Date.now().toString(36),
      nama: userData.nama,
      username: username,
      email: email,
      passwordHash: passwordHash,
      role: 'guru',
      status: 'menunggu_verifikasi', // Sesuai spesifikasi RPD
      jabatan: userData.jabatan || 'Guru Mata Pelajaran',
      mata_pelajaran: userData.mata_pelajaran || '-',
      pangkat_golongan: userData.pangkat_golongan || '-',
      nip: userData.nip || '-',
      createdAt: new Date().toISOString()
    };

    window.Storage.insert('user', newUser, `Pendaftaran akun guru baru: ${newUser.nama} (Menunggu Verifikasi)`);
    return newUser;
  },

  async resetPassword(identifier, newPassword) {
    await window.Storage.init();
    const users = window.Storage.getAll('user');
    const cleanId = (identifier || '').trim().toLowerCase();

    const user = users.find(u => 
      (u.username && u.username.toLowerCase() === cleanId) ||
      (u.email && u.email.toLowerCase() === cleanId)
    );

    if (!user) {
      throw new Error('Akun dengan username atau email tersebut tidak ditemukan.');
    }

    const newHash = await this.hashPassword(newPassword);
    window.Storage.update('user', user.id, {
      passwordHash: newHash,
      password: null // Hapus plain pass jika ada
    }, `Reset kata sandi untuk akun ${user.nama} (${user.username})`);

    return true;
  },

  requireAuth(allowedRoles = []) {
    const user = this.getCurrentUser();
    const currentPath = window.location.pathname;
    const isLoginPage = currentPath.endsWith('index.html') || currentPath.endsWith('/') || currentPath === '';

    if (!user) {
      if (!isLoginPage) {
        window.location.href = 'index.html';
      }
      return null;
    }

    // Jika sudah login dan buka halaman index.html, redirect ke dashboard
    if (isLoginPage) {
      window.location.href = 'dashboard.html';
      return user;
    }

    // Cek Role spesifik jika dibatasi
    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
      alert('Akses Ditolak: Halaman ini hanya dapat diakses oleh Administrator.');
      window.location.href = 'dashboard.html';
      return null;
    }

    return user;
  }
};

window.Auth = Auth;
