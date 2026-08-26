<?php
require '../../config/database.php';
require '../../config/helpers.php';

$s   = require_login();
$pdo = db();

if ($s['role'] === 'petani') {
    $stmt = $pdo->prepare('SELECT id, kode, vwc, suhu, baterai FROM lahan WHERE user_id = ?');
    $stmt->execute([$s['user_id']]);
} else {
    $stmt = $pdo->query('SELECT id, kode, vwc, suhu, baterai FROM lahan');
}

$data = $stmt->fetchAll();
foreach ($data as &$row) {
    $row['status'] = status_vwc((float) $row['vwc']);
}

respond(['ok' => true, 'data' => $data]);
