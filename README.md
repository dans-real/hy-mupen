# HyMupen — Platform Irigasi Hidrogel Pintar

Aplikasi monitoring & kontrol irigasi berbasis hidrogel untuk petani dan penyuluh
pertanian, dikembangkan di Universitas Trunojoyo Madura.

**Stack:** PHP native + MySQL (phpMyAdmin) · HTML/CSS/JS tanpa framework

Lihat [`CARA_PAKAI.md`](CARA_PAKAI.md) untuk panduan instalasi & penggunaan lengkap.

## Ringkasan fitur
- Login & registrasi nyata (petani/penyuluh) dengan sesi PHP + password ter-hash
- Setiap petani punya database petak lahan sendiri (CRUD penuh)
- Penyuluh melihat & memberi rekomendasi ke seluruh petak binaan
- Simulasi sensor kelembapan real-time (polling), irigasi manual & otomatis darurat
- Prediksi risiko kekeringan 7 hari, riwayat irigasi, notifikasi
- Panel admin/dev terpisah untuk data sensor teknis & log sistem
