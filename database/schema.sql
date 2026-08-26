-- ═══════════════════════════════════════════════════════════
--  HyMupen — Skema Database
--  Universitas Trunojoyo Madura · 2026
--  Cara pakai: buka phpMyAdmin > Import > pilih file ini
-- ═══════════════════════════════════════════════════════════

CREATE DATABASE IF NOT EXISTS hymupen CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE hymupen;

-- ── Akun petani & penyuluh
CREATE TABLE users (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username        VARCHAR(50)  NOT NULL UNIQUE,
    password        VARCHAR(255) NOT NULL,
    nama_lengkap    VARCHAR(100) NOT NULL,
    role            ENUM('petani','penyuluh') NOT NULL,
    telepon         VARCHAR(20)  DEFAULT NULL,
    dibuat_pada     DATETIME     DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ── Akun admin/dev (panel terpisah, superadmin only)
CREATE TABLE admins (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username        VARCHAR(50)  NOT NULL UNIQUE,
    password        VARCHAR(255) NOT NULL,
    dibuat_pada     DATETIME     DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ── Petak lahan (milik petani, 1 petani bisa punya banyak petak)
CREATE TABLE lahan (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id         INT UNSIGNED NOT NULL,
    kode            VARCHAR(10)  NOT NULL,
    nama            VARCHAR(100) NOT NULL,
    jenis_tanaman   VARCHAR(50)  NOT NULL,
    lokasi          VARCHAR(100) DEFAULT NULL,
    luas_m2         DECIMAL(10,2) DEFAULT NULL,
    ambang_vwc      DECIMAL(5,2) NOT NULL DEFAULT 35,
    dosis_hidrogel  INT          NOT NULL DEFAULT 80,
    node_sensor     VARCHAR(50)  DEFAULT NULL,
    vwc             DECIMAL(5,2) NOT NULL DEFAULT 50,
    suhu            DECIMAL(5,2) NOT NULL DEFAULT 30,
    baterai         TINYINT UNSIGNED NOT NULL DEFAULT 100,
    dibuat_pada     DATETIME DEFAULT CURRENT_TIMESTAMP,
    diperbarui_pada DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_user_kode (user_id, kode),
    CONSTRAINT fk_lahan_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── Riwayat pembacaan sensor (untuk grafik & prediksi)
CREATE TABLE sensor_log (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    lahan_id        INT UNSIGNED NOT NULL,
    vwc             DECIMAL(5,2) NOT NULL,
    suhu            DECIMAL(5,2) NOT NULL,
    dicatat_pada    DATETIME DEFAULT CURRENT_TIMESTAMP,
    KEY idx_lahan_waktu (lahan_id, dicatat_pada),
    CONSTRAINT fk_sensorlog_lahan FOREIGN KEY (lahan_id) REFERENCES lahan(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── Riwayat irigasi
CREATE TABLE irigasi_log (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    lahan_id        INT UNSIGNED NOT NULL,
    dosis_g         INT UNSIGNED NOT NULL,
    dipicu_oleh     ENUM('manual','otomatis') NOT NULL DEFAULT 'manual',
    dilakukan_pada  DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_irigasi_lahan FOREIGN KEY (lahan_id) REFERENCES lahan(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── Stok hidrogel per petani
CREATE TABLE stok_hidrogel (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id         INT UNSIGNED NOT NULL UNIQUE,
    stok_g          DECIMAL(10,2) NOT NULL DEFAULT 2400,
    diperbarui_pada DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_stok_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── Notifikasi per akun
CREATE TABLE notifikasi (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id         INT UNSIGNED NOT NULL,
    lahan_id        INT UNSIGNED DEFAULT NULL,
    tipe            ENUM('kritis','peringatan','info','sukses') NOT NULL DEFAULT 'info',
    judul           VARCHAR(150) NOT NULL,
    isi             TEXT,
    dibaca          TINYINT(1) NOT NULL DEFAULT 0,
    dibuat_pada     DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notif_user  FOREIGN KEY (user_id)  REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_notif_lahan FOREIGN KEY (lahan_id) REFERENCES lahan(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ── Log percobaan login (dipakai panel admin/dev)
CREATE TABLE login_log (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username        VARCHAR(50) NOT NULL,
    role            VARCHAR(20) NOT NULL,
    status          ENUM('sukses','gagal') NOT NULL,
    ip_address      VARCHAR(45) DEFAULT NULL,
    waktu           DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ═══════════════════════════════════════════════════════════
-- DATA CONTOH (opsional — hapus blok ini untuk database kosong)
-- Password semua akun contoh: "petani123" / "penyuluh123" / "admin123"
-- ═══════════════════════════════════════════════════════════
INSERT INTO users (username, password, nama_lengkap, role, telepon) VALUES
('budi',   '$2y$10$vYI0qdyW2yftRw3F5FwB3ezM2KKUE2XXvLehxP/TLhkh1mIqQmUEO', 'Budi Santoso', 'petani',   '081234567890'),
('siti',   '$2y$10$C1hwPXWRRfH1O0WYvg1XauqjcjWy.c7qGCHGqVm5Ikob3SNLa7N4O', 'Siti Rahayu',  'penyuluh', '081234567891');

INSERT INTO stok_hidrogel (user_id, stok_g) VALUES (1, 2400);

INSERT INTO lahan (user_id, kode, nama, jenis_tanaman, lokasi, ambang_vwc, dosis_hidrogel, node_sensor, vwc, suhu, baterai) VALUES
(1, 'A1', 'Petak Utara 1', 'Jagung',  'Blok Utara',   35, 80,  'ESP-001', 38.0, 34.2, 91),
(1, 'A2', 'Petak Utara 2', 'Kedelai', 'Blok Utara',   42, 85,  'ESP-002', 52.3, 32.1, 78),
(1, 'B1', 'Petak Selatan 1','Cabai',  'Blok Selatan', 38, 120, 'LoRa-001', 28.1, 33.8, 65);

INSERT INTO admins (username, password) VALUES
('admin', '$2y$10$7FtYPKxl4IHqOtnrV9B0VuQpWpHCl3Ic740CJDBqjCrl.oJIffROC');
