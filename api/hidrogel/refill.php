<?php
require '../../config/database.php';
require '../../config/helpers.php';

$s = require_role('petani');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(['ok' => false, 'error' => 'Method tidak diizinkan.'], 405);
}

$in     = json_input();
$jumlah = (float) ($in['jumlah_g'] ?? 0);
if ($jumlah <= 0) {
    respond(['ok' => false, 'error' => 'Jumlah pengisian tidak valid.'], 400);
}

$pdo = db();
$pdo->prepare('UPDATE stok_hidrogel SET stok_g = LEAST(5000, stok_g + ?) WHERE user_id = ?')
    ->execute([$jumlah, $s['user_id']]);

$stmt = $pdo->prepare('SELECT stok_g FROM stok_hidrogel WHERE user_id = ?');
$stmt->execute([$s['user_id']]);

respond(['ok' => true, 'stok_g' => (float) $stmt->fetchColumn(), 'message' => 'Stok hidrogel berhasil diperbarui.']);
