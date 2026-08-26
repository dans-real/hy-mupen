<?php
require '../../config/database.php';
require '../../config/helpers.php';

require_admin();
$pdo = db();

$data = $pdo->query(
    'SELECT l.*, u.username AS pemilik_username, u.nama_lengkap AS pemilik
     FROM lahan l JOIN users u ON u.id = l.user_id
     ORDER BY l.id'
)->fetchAll();
foreach ($data as &$row) {
    $row['status'] = status_vwc((float) $row['vwc']);
}

respond(['ok' => true, 'data' => $data]);
