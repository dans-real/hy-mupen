<?php
require '../../config/database.php';
require '../../config/helpers.php';

$s   = require_role('petani');
$pdo = db();

$stmt = $pdo->prepare('SELECT stok_g FROM stok_hidrogel WHERE user_id = ?');
$stmt->execute([$s['user_id']]);
$row = $stmt->fetch();
$stokG = $row ? (float) $row['stok_g'] : 0;

respond([
    'ok'              => true,
    'stok_g'          => $stokG,
    'stok_kg'         => round($stokG / 1000, 2),
    'perkiraan_hari'  => $stokG > 0 ? (int) round($stokG / 133) : 0,
    'status'          => $stokG < 500 ? 'kritis' : ($stokG < 1500 ? 'rendah' : 'baik'),
]);
