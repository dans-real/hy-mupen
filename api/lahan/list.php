<?php
require '../../config/database.php';
require '../../config/helpers.php';

$s   = require_login();
$pdo = db();

if ($s['role'] === 'petani') {
    $stmt = $pdo->prepare('SELECT * FROM lahan WHERE user_id = ? ORDER BY id');
    $stmt->execute([$s['user_id']]);
} else {
    // Penyuluh: lihat semua petak beserta nama pemiliknya
    $stmt = $pdo->query(
        'SELECT l.*, u.nama_lengkap AS pemilik, u.username AS pemilik_username
         FROM lahan l JOIN users u ON u.id = l.user_id
         ORDER BY l.id'
    );
}

$data = $stmt->fetchAll();
foreach ($data as &$row) {
    $row['status'] = status_vwc((float) $row['vwc']);
}

respond(['ok' => true, 'data' => $data]);
