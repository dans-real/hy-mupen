<?php
require '../../config/database.php';
require '../../config/helpers.php';

$s = require_role('petani');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(['ok' => false, 'error' => 'Method tidak diizinkan.'], 405);
}

$in     = json_input();
$kode   = strtoupper(trim($in['kode'] ?? ''));
$nama   = trim($in['nama'] ?? '');
$jenis  = trim($in['jenis_tanaman'] ?? '');
$lokasi = trim($in['lokasi'] ?? '');
$luas   = $in['luas_m2'] ?? null;
$ambang = is_numeric($in['ambang_vwc'] ?? null) ? (float) $in['ambang_vwc'] : 35;
$dosis  = is_numeric($in['dosis_hidrogel'] ?? null) ? (int) $in['dosis_hidrogel'] : 80;

if ($kode === '' || $nama === '' || $jenis === '') {
    respond(['ok' => false, 'error' => 'Kode petak, nama petak, dan jenis tanaman wajib diisi.'], 400);
}
if (!preg_match('/^[A-Z0-9\-]{1,10}$/', $kode)) {
    respond(['ok' => false, 'error' => 'Kode petak maksimal 10 karakter (huruf/angka/strip), contoh: A1.'], 400);
}

$pdo = db();

$chk = $pdo->prepare('SELECT id FROM lahan WHERE user_id = ? AND kode = ?');
$chk->execute([$s['user_id'], $kode]);
if ($chk->fetch()) {
    respond(['ok' => false, 'error' => "Kode petak '{$kode}' sudah kamu pakai, pilih kode lain."], 409);
}

$pdo->prepare(
    'INSERT INTO lahan (user_id, kode, nama, jenis_tanaman, lokasi, luas_m2, ambang_vwc, dosis_hidrogel, vwc, suhu, baterai)
     VALUES (?,?,?,?,?,?,?,?,50,30,100)'
)->execute([$s['user_id'], $kode, $nama, $jenis, $lokasi ?: null, $luas ?: null, $ambang, $dosis]);

respond(['ok' => true, 'id' => (int) $pdo->lastInsertId(), 'message' => 'Petak lahan berhasil ditambahkan.']);
