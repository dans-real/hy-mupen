# HyMupen — Panduan Penggunaan
**Universitas Trunojoyo Madura · 2025**

---

## ⚡ Cara Cepat (Windows)

1. **Extract** file zip ke folder mana saja
2. **Klik dua kali** `START.bat`
3. Browser otomatis terbuka dengan aplikasi
4. Selesai ✅

---

## 📋 Prasyarat

| Kebutuhan | Versi | Download |
|-----------|-------|----------|
| Python | 3.10+ | [python.org](https://python.org) |
| Browser | Chrome/Edge | Sudah ada di Windows |

> **Saat install Python:** centang ✅ **"Add Python to PATH"**

---

## 🗂 Struktur File

```
HyMupen/
├── START.bat              ← Klik ini untuk menjalankan
├── CARA_PAKAI.md          ← File ini
├── backend/
│   ├── server.py          ← Backend FastAPI (otomatis jalan)
│   └── requirements.txt   ← Python dependencies
└── frontend/
    └── index.html         ← Aplikasi web (buka di browser)
```

---

## 🔌 Mode Operasi

Aplikasi bisa jalan dalam **dua mode**:

### 🟡 Mode Simulasi (tanpa backend)
- Buka saja `frontend/index.html` langsung di browser
- Data sensor disimulasikan di JavaScript
- Semua fitur berjalan, tapi data bukan dari sensor nyata
- **Cocok untuk demo/presentasi**

### 🟢 Mode Live (dengan backend)
- Jalankan `START.bat`
- Backend Python berjalan di background
- Data sensor diupdate dari server setiap 5 detik via WebSocket
- Irigasi, stok hidrogel, dan prediksi tersimpan persistent
- Indikator di pojok atas menunjukkan **🟢 Live**
- **Cocok untuk demo dengan backend aktif**

---

## 🎭 Tiga Mode Pengguna

| Mode | Untuk Siapa | Fitur Utama |
|------|-------------|-------------|
| 🧑‍🌾 Petani | Petani | Kondisi lahan, irigasi 1 ketuk, prediksi |
| 👨‍💼 Penyuluh | Penyuluh pertanian | Overview semua petani, laporan |
| ⚙️ Dev | Teknisi/admin | Data teknis sensor, log sistem, konfigurasi |

---

## 🤖 Fitur AI (Tab 🤖 di setiap mode)

- Chat dengan AI berdasarkan **data sensor aktual**
- Analisis kondisi lahan, rekomendasi dosis, prediksi kekeringan
- Jika tidak ada koneksi internet → fallback response lokal

---

## 🌐 API Endpoints (saat backend jalan)

| Endpoint | Fungsi |
|----------|--------|
| `http://localhost:8000/docs` | Dokumentasi API interaktif |
| `http://localhost:8000/api/v1/fields` | Data semua petak |
| `http://localhost:8000/api/v1/sensors/snapshot` | Snapshot sensor |
| `http://localhost:8000/api/v1/hydrogel/stock` | Stok hidrogel |
| `ws://localhost:8000/ws/sensor-stream` | WebSocket real-time |

---

## 🔧 Troubleshooting

### Browser tidak terbuka otomatis
→ Buka file `frontend/index.html` secara manual di Chrome/Edge

### Indikator tetap 🟡 Simulasi
→ Pastikan `START.bat` dijalankan terlebih dahulu  
→ Tunggu 5-10 detik, indikator akan berubah otomatis

### Error saat install dependencies
```
pip install fastapi uvicorn -q
```
Jalankan perintah di atas di Command Prompt

### Port 8000 sudah dipakai
Edit baris terakhir di `backend/server.py`:
```python
uvicorn.run("server:app", port=8001, ...)  # ganti 8000 → 8001
```

---

## 📡 Integrasi Sensor IoT Nyata

Untuk menghubungkan sensor ESP32/LoRa ke backend:

1. ESP32 mengirim data ke MQTT broker
2. Backend berlangganan MQTT dan meneruskan ke WebSocket
3. Frontend menerima update real-time

Format data MQTT:
```
Topic   : hymupen/sensor/A1/vwc
Payload : 38.5
```

---

## 📖 Tentang Produk Hidrogel Hy-Mupen

| Parameter | Nilai |
|-----------|-------|
| Bahan 1 | Rumput gajah (*Pennisetum purpureum*) — silika SiO₂ 67.3% |
| Bahan 2 | Kulit pisang (*Musa paradisiaca*) — pati 30%, pektin |
| Swelling | 400× berat kering |
| Biodegradable | 100% |

---

*HyMupen · Universitas Trunojoyo Madura · 2025*
