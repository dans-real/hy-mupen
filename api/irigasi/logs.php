<?php
require '../../config/database.php';
require '../../config/helpers.php';

$s   = require_role('petani');
$pdo = db();

$stmt = $pdo->prepare(
    'SELECT il.*, l.kode, l.nama
     FROM irigasi_log il JOIN lahan l ON l.id = il.lahan_id
     WHERE l.user_id = ?
     ORDER BY il.dilakukan_pada DESC LIMIT 30'
);
$stmt->execute([$s['user_id']]);

respond(['ok' => true, 'data' => $stmt->fetchAll()]);
