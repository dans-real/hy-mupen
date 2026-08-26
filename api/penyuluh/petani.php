<?php
require '../../config/database.php';
require '../../config/helpers.php';

$s   = require_role('penyuluh');
$pdo = db();

$petani = $pdo->query(
    "SELECT id, username, nama_lengkap, telepon FROM users WHERE role = 'petani' ORDER BY nama_lengkap"
)->fetchAll();

foreach ($petani as &$p) {
    $stmt = $pdo->prepare('SELECT id, kode, nama, jenis_tanaman, vwc, ambang_vwc FROM lahan WHERE user_id = ?');
    $stmt->execute([$p['id']]);
    $lahan = $stmt->fetchAll();
    foreach ($lahan as &$l) {
        $l['status'] = status_vwc((float) $l['vwc']);
    }
    $p['lahan'] = $lahan;
}

respond(['ok' => true, 'data' => $petani]);
