<?php
require '../../config/database.php';
require '../../config/helpers.php';

$s = require_login();
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(['ok' => false, 'error' => 'Method tidak diizinkan.'], 405);
}

$in = json_input();
$id = (int) ($in['id'] ?? 0);
if (!$id) {
    respond(['ok' => false, 'error' => 'ID petak tidak valid.'], 400);
}

$pdo  = db();
$stmt = $pdo->prepare('SELECT * FROM lahan WHERE id = ?');
$stmt->execute([$id]);
$lahan = $stmt->fetch();
if (!$lahan) {
    respond(['ok' => false, 'error' => 'Petak lahan tidak ditemukan.'], 404);
}

if ($s['role'] === 'petani') {
    if ((int) $lahan['user_id'] !== (int) $s['user_id']) {
        respond(['ok' => false, 'error' => 'Kamu tidak punya akses ke petak ini.'], 403);
    }
    // Petani boleh ubah semua data petak miliknya
    $allowed = ['nama', 'jenis_tanaman', 'lokasi', 'luas_m2', 'ambang_vwc', 'dosis_hidrogel', 'node_sensor'];
} else {
    // Penyuluh hanya boleh menyesuaikan rekomendasi teknis (ambang & dosis)
    $allowed = ['ambang_vwc', 'dosis_hidrogel'];
}

$sets = [];
$vals = [];
foreach ($allowed as $f) {
    if (array_key_exists($f, $in)) {
        $sets[] = "{$f} = ?";
        $vals[] = $in[$f] === '' ? null : $in[$f];
    }
}
if (!$sets) {
    respond(['ok' => false, 'error' => 'Tidak ada perubahan yang dikirim.'], 400);
}
$vals[] = $id;

$pdo->prepare('UPDATE lahan SET ' . implode(', ', $sets) . ' WHERE id = ?')->execute($vals);

respond(['ok' => true, 'message' => 'Petak lahan berhasil diperbarui.']);
