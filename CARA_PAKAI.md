# HyMupen — Panduan Penggunaan
**Universitas Trunojoyo Madura · 2026**

Versi ini menggantikan backend Python/FastAPI sebelumnya dengan **PHP native + MySQL**
(siap dipakai lewat XAMPP/Laragon + phpMyAdmin), lengkap dengan login, database per
petak lahan, dan panel admin terpisah.

---

## ⚡ Cara Cepat (XAMPP)

1. **Install** [XAMPP](https://www.apachefriends.org/) (atau Laragon) jika belum ada
2. **Salin** folder `hymupen/` ke `htdocs/` (XAMPP) atau `www/` (Laragon)
3. **Nyalakan** Apache & MySQL dari XAMPP Control Panel
4. **Buka phpMyAdmin** (`http://localhost/phpmyadmin`) → tab **Import** → pilih file
   `hymupen/database/schema.sql` → klik **Go**
   (ini otomatis membuat database `hymupen` beserta 3 akun contoh)
5. **Buka** `http://localhost/hymupen/public/login.html` di browser
6. Selesai ✅

> Kalau MySQL kamu pakai user/password berbeda dari default XAMPP (`root` tanpa
> password), sesuaikan di `config/database.php`.

---

## 🔑 Akun contoh (dari schema.sql)

| Username | Password | Role |
|----------|----------|------|
| `budi` | `petani123` | Petani (punya 3 petak: A1, A2, B1) |
| `siti` | `penyuluh123` | Penyuluh |
| `admin` | `admin123` | Admin/Dev (login lewat `admin.html`, terpisah dari user biasa) |

Atau daftar akun baru sendiri lewat halaman login → **Daftar**.

---

## 🗂 Struktur Folder

```
hymupen/
├── database/
│   └── schema.sql         ← import ini ke phpMyAdmin
├── config/
│   ├── database.php       ← pengaturan koneksi MySQL
│   └── helpers.php        ← session, validasi, fungsi bersama
├── api/                   ← seluruh endpoint backend (JSON)
│   ├── auth/               (register, login, logout, session, admin_login)
│   ├── lahan/               (list, create, update, delete)
│   ├── sensor/              (snapshot, tick)
│   ├── irigasi/             (trigger, logs)
│   ├── hidrogel/            (stock, refill)
│   ├── notifikasi/          (list, baca)
│   ├── prediksi/            (kekeringan)
│   ├── penyuluh/            (ringkasan, petani)
│   └── admin/               (sensor, log, logout)
└── public/                ← yang dibuka di browser
    ├── login.html           (login + daftar)
    ├── app.html              (aplikasi utama petani/penyuluh)
    ├── admin.html            (panel admin/dev, login terpisah)
    └── assets/
        ├── css/style.css
        └── js/ (api.js, auth.js, app.js, admin.js)
```

---

## 👤 Dua Peran Pengguna + 1 Panel Terpisah

| Peran | Untuk siapa | Data yang terlihat |
|-------|-------------|---------------------|
| 🧑‍🌾 **Petani** | Petani | Hanya petak lahan miliknya sendiri — bisa tambah/edit/hapus |
| 👨‍💼 **Penyuluh** | Penyuluh pertanian | Semua petak dari semua petani binaan (lihat & sesuaikan ambang/dosis) |
| ⚙️ **Admin/Dev** | Teknisi | Data sensor teknis semua petak + log login & irigasi sistem — login terpisah di `admin.html`, tidak muncul di alur login petani/penyuluh |

---

## 🌱 Simulasi Sensor

Karena belum ada sensor IoT fisik, kelembapan tanah disimulasikan otomatis di
server: setiap ± 8 detik selagi petani membuka aplikasi, frontend memanggil
`api/sensor/tick.php` yang memajukan nilai VWC/suhu secara realistis, mencatat
riwayat, membuat notifikasi saat status berubah, dan memicu irigasi darurat
otomatis jika kelembapan sangat kritis (< 25%).

Untuk sensor IoT sungguhan (ESP32/LoRa), ganti simulasi ini dengan endpoint yang
menerima data dari MQTT/HTTP sensor lalu menyimpannya langsung ke tabel `lahan` &
`sensor_log`.

---

## 🔧 Troubleshooting

**"Koneksi database gagal"**
→ Pastikan MySQL sudah menyala di XAMPP dan database `hymupen` sudah diimport.

**Halaman blank / error 500**
→ Cek folder `api/` & `config/` ikut ter-copy (bukan cuma `public/`).

**Login selalu gagal padahal password benar**
→ Pastikan schema.sql yang diimport adalah versi terbaru (hash password contoh
sudah di-generate ulang dan diuji langsung, bukan placeholder).

---

## 📖 Tentang Produk Hidrogel Hy-Mupen

| Parameter | Nilai |
|-----------|-------|
| Bahan 1 | Rumput gajah (*Pennisetum purpureum*) — silika SiO₂ 67.3% |
| Bahan 2 | Kulit pisang (*Musa paradisiaca*) — pati 30%, pektin |
| Swelling | 400× berat kering |
| Biodegradable | 100% |

---

*HyMupen · Universitas Trunojoyo Madura · 2026*
