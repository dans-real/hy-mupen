<?php
/**
 * Dipanggil berkala oleh frontend (mis. tiap 8 detik selagi app dibuka) untuk
 * memajukan simulasi pembacaan sensor petani yang sedang login, mencatat riwayat,
 * membuat notifikasi saat status berubah, dan memicu irigasi darurat otomatis.
 *
 * Ini menggantikan simulator WebSocket pada backend Python versi sebelumnya
 * dengan polling HTTP sederhana yang cocok untuk hosting PHP standar.
 */
require '../../config/database.php';
require '../../config/helpers.php';

$s   = require_role('petani');
$pdo = db();

$stmt = $pdo->prepare('SELECT * FROM lahan WHERE user_id = ?');
$stmt->execute([$s['user_id']]);
$semua = $stmt->fetchAll();

$notifBaru = [];

foreach ($semua as $l) {
    $drift = -0.05 - (mt_rand(0, 30) / 1000);
    $noise = mt_rand(-15, 15) / 100;
    $vwc   = max(15, min(85, round((float) $l['vwc'] + $drift + $noise, 2)));
    $suhu  = round((float) $l['suhu'] + (mt_rand(-8, 8) / 100), 1);

    $pdo->prepare('UPDATE lahan SET vwc=?, suhu=? WHERE id=?')->execute([$vwc, $suhu, $l['id']]);
    $pdo->prepare('INSERT INTO sensor_log (lahan_id, vwc, suhu) VALUES (?,?,?)')->execute([$l['id'], $vwc, $suhu]);

    $statusBaru = status_vwc($vwc);
    $statusLama = status_vwc((float) $l['vwc']);

    if ($statusBaru !== $statusLama && $statusBaru !== 'baik') {
        $judul = $statusBaru === 'kritis'
            ? "Petak {$l['kode']} kritis — {$vwc}% VWC"
            : "Petak {$l['kode']} mendekati ambang batas";
        $isi = $statusBaru === 'kritis'
            ? "Kelembapan tanah di bawah titik layu permanen {$l['jenis_tanaman']}. Segera irigasi."
            : "VWC {$vwc}% mendekati ambang {$l['ambang_vwc']}%. Pertimbangkan irigasi.";

        $pdo->prepare('INSERT INTO notifikasi (user_id, lahan_id, tipe, judul, isi) VALUES (?,?,?,?,?)')
            ->execute([$s['user_id'], $l['id'], $statusBaru === 'kritis' ? 'kritis' : 'peringatan', $judul, $isi]);
        $notifBaru[] = $judul;
    }

    // Auto-irigasi darurat jika sangat kritis & stok mencukupi
    if ($vwc < 25) {
        $stokStmt = $pdo->prepare('SELECT stok_g FROM stok_hidrogel WHERE user_id = ?');
        $stokStmt->execute([$s['user_id']]);
        $stokG = (float) $stokStmt->fetchColumn();
        if ($stokG >= $l['dosis_hidrogel']) {
            lakukan_irigasi($pdo, (int) $l['id'], (int) $s['user_id'], (int) $l['dosis_hidrogel'], 'otomatis');
        }
    }
}

$stmt = $pdo->prepare('SELECT * FROM lahan WHERE user_id = ?');
$stmt->execute([$s['user_id']]);
$data = $stmt->fetchAll();
foreach ($data as &$row) {
    $row['status'] = status_vwc((float) $row['vwc']);
}

respond(['ok' => true, 'data' => $data, 'notifikasi_baru' => $notifBaru]);
