<?php
require '../../config/database.php';
require '../../config/helpers.php';

$s = require_role('petani');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(['ok' => false, 'error' => 'Method tidak diizinkan.'], 405);
}

$in      = json_input();
$lahanId = (int) ($in['lahan_id'] ?? 0);

$pdo  = db();
$stmt = $pdo->prepare('SELECT * FROM lahan WHERE id = ? AND user_id = ?');
$stmt->execute([$lahanId, $s['user_id']]);
$lahan = $stmt->fetch();
if (!$lahan) {
    respond(['ok' => false, 'error' => 'Petak lahan tidak ditemukan.'], 404);
}

$hasil = lakukan_irigasi($pdo, $lahanId, (int) $s['user_id'], (int) $lahan['dosis_hidrogel'], 'manual');
if (!$hasil['ok']) {
    respond($hasil, 400);
}

respond(['ok' => true, 'stok_sisa' => $hasil['stok_sisa'], 'message' => 'Irigasi berhasil dijalankan.']);
