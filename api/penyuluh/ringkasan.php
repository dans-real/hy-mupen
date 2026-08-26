<?php
require '../../config/database.php';
require '../../config/helpers.php';

$s   = require_role('penyuluh');
$pdo = db();

$totalPetani = (int) $pdo->query("SELECT COUNT(*) FROM users WHERE role = 'petani'")->fetchColumn();
$totalLahan  = (int) $pdo->query('SELECT COUNT(*) FROM lahan')->fetchColumn();
$kritis      = (int) $pdo->query('SELECT COUNT(*) FROM lahan WHERE vwc < 30')->fetchColumn();
$peringatan  = (int) $pdo->query('SELECT COUNT(*) FROM lahan WHERE vwc >= 30 AND vwc < 45')->fetchColumn();

respond([
    'ok'           => true,
    'total_petani' => $totalPetani,
    'total_lahan'  => $totalLahan,
    'kritis'       => $kritis,
    'peringatan'   => $peringatan,
]);
