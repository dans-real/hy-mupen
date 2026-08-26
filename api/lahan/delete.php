<?php
require '../../config/database.php';
require '../../config/helpers.php';

$s = require_role('petani');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(['ok' => false, 'error' => 'Method tidak diizinkan.'], 405);
}

$in = json_input();
$id = (int) ($in['id'] ?? 0);
if (!$id) {
    respond(['ok' => false, 'error' => 'ID petak tidak valid.'], 400);
}

$pdo  = db();
$stmt = $pdo->prepare('SELECT id FROM lahan WHERE id = ? AND user_id = ?');
$stmt->execute([$id, $s['user_id']]);
if (!$stmt->fetch()) {
    respond(['ok' => false, 'error' => 'Petak lahan tidak ditemukan atau bukan milikmu.'], 404);
}

$pdo->prepare('DELETE FROM lahan WHERE id = ?')->execute([$id]);

respond(['ok' => true, 'message' => 'Petak lahan berhasil dihapus.']);
