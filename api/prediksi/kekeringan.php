<?php
require '../../config/database.php';
require '../../config/helpers.php';

$s   = require_login();
$pdo = db();

$lahanId = (int) ($_GET['lahan_id'] ?? 0);
$horizon = min(14, max(1, (int) ($_GET['horizon'] ?? 7)));

$stmt = $pdo->prepare('SELECT * FROM lahan WHERE id = ?');
$stmt->execute([$lahanId]);
$lahan = $stmt->fetch();
if (!$lahan) {
    respond(['ok' => false, 'error' => 'Petak tidak ditemukan.'], 404);
}
if ($s['role'] === 'petani' && (int) $lahan['user_id'] !== (int) $s['user_id']) {
    respond(['ok' => false, 'error' => 'Akses ditolak.'], 403);
}

$hist = $pdo->prepare('SELECT vwc FROM sensor_log WHERE lahan_id = ? ORDER BY dicatat_pada DESC LIMIT 72');
$hist->execute([$lahanId]);
$vwcs = array_reverse(array_map('floatval', array_column($hist->fetchAll(), 'vwc')));

$current = (float) $lahan['vwc'];
$n       = count($vwcs);

if ($n >= 2) {
    // Perkiraan kasar berbasis regresi linear sederhana pada riwayat pembacaan terakhir.
    $slope      = ($vwcs[$n - 1] - $vwcs[0]) / $n;
    $dailySlope = $slope * 24; // skala per hari (asumsi 1 pembacaan ~ 1 jam pemakaian nyata)
} else {
    $dailySlope = -0.8; // asumsi default jika data historis belum cukup
}

$forecast = [];
for ($d = 0; $d < $horizon; $d++) {
    $pred       = $current + $dailySlope * ($d + 1) * exp(-$d * 0.12);
    $forecast[] = round(max(15, min(85, $pred)), 1);
}

$minPred = min($forecast);
$risiko  = $minPred < 33 ? 'tinggi' : ($minPred < 42 ? 'sedang' : 'rendah');

respond([
    'ok'           => true,
    'lahan_id'     => $lahanId,
    'horizon_hari' => $horizon,
    'perkiraan'    => $forecast,
    'risiko'       => $risiko,
    'min_perkiraan'=> $minPred,
    'catatan'      => $n < 2 ? 'Data historis masih sedikit, perkiraan memakai asumsi umum.' : null,
]);
