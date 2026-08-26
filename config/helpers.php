<?php
/**
 * Helper bersama untuk semua endpoint API HyMupen.
 * File ini di-require setelah config/database.php di tiap endpoint.
 */

if (session_status() === PHP_SESSION_NONE) {
    session_set_cookie_params([
        'lifetime' => 60 * 60 * 8, // 8 jam
        'path'     => '/',
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

header('Content-Type: application/json; charset=utf-8');
// CORS: pantulkan origin pemanggil (bukan wildcard) supaya kompatibel dengan
// fetch(...,{credentials:'include'}) di frontend, termasuk saat frontend & backend
// dijalankan di port berbeda ketika pengembangan lokal.
if (!empty($_SERVER['HTTP_ORIGIN'])) {
    header('Access-Control-Allow-Origin: ' . $_SERVER['HTTP_ORIGIN']);
    header('Access-Control-Allow-Credentials: true');
}
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

/** Ambil body JSON dari request sebagai array asosiatif. */
function json_input(): array
{
    $raw  = file_get_contents('php://input');
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

/** Kirim response JSON lalu hentikan eksekusi. */
function respond(array $data, int $code = 200): void
{
    http_response_code($code);
    echo json_encode($data);
    exit;
}

/** Pastikan pengguna (petani/penyuluh) sudah login. Kembalikan data sesi. */
function require_login(): array
{
    if (empty($_SESSION['user_id'])) {
        respond(['ok' => false, 'error' => 'Sesi berakhir, silakan login kembali.'], 401);
    }
    return $_SESSION;
}

/** Pastikan pengguna login dan memiliki salah satu role yang diizinkan. */
function require_role(string ...$roles): array
{
    $s = require_login();
    if (!in_array($s['role'], $roles, true)) {
        respond(['ok' => false, 'error' => 'Akses ditolak untuk role ini.'], 403);
    }
    return $s;
}

/** Pastikan admin/dev sudah login ke panel terpisah. */
function require_admin(): void
{
    if (empty($_SESSION['admin_id'])) {
        respond(['ok' => false, 'error' => 'Belum login sebagai admin.'], 401);
    }
}

/**
 * Jalankan satu siklus irigasi: kurangi stok, catat log, naikkan VWC, buat notifikasi.
 * Dipakai bareng oleh trigger manual & auto-irigasi darurat.
 */
function lakukan_irigasi(PDO $pdo, int $lahanId, int $userId, int $dosisG, string $dipicuOleh = 'manual'): array
{
    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare('SELECT stok_g FROM stok_hidrogel WHERE user_id = ? FOR UPDATE');
        $stmt->execute([$userId]);
        $row = $stmt->fetch();
        $stokSekarang = $row ? (float) $row['stok_g'] : 0.0;

        if ($stokSekarang < $dosisG) {
            $pdo->rollBack();
            return ['ok' => false, 'error' => "Stok hidrogel tidak cukup (sisa {$stokSekarang}g)."];
        }

        $stokBaru = $stokSekarang - $dosisG;
        $pdo->prepare('UPDATE stok_hidrogel SET stok_g = ? WHERE user_id = ?')->execute([$stokBaru, $userId]);
        $pdo->prepare('INSERT INTO irigasi_log (lahan_id, dosis_g, dipicu_oleh) VALUES (?,?,?)')
            ->execute([$lahanId, $dosisG, $dipicuOleh]);
        $pdo->prepare('UPDATE lahan SET vwc = LEAST(85, vwc + ?) WHERE id = ?')
            ->execute([$dosisG * 0.06, $lahanId]);

        $stmtKode = $pdo->prepare('SELECT kode FROM lahan WHERE id = ?');
        $stmtKode->execute([$lahanId]);
        $kode = $stmtKode->fetchColumn() ?: '?';

        $pdo->prepare('INSERT INTO notifikasi (user_id, lahan_id, tipe, judul, isi) VALUES (?,?,?,?,?)')
            ->execute([
                $userId, $lahanId, 'sukses',
                "Irigasi petak {$kode} selesai",
                "{$dosisG}g hidrogel berhasil didistribusikan (" . ($dipicuOleh === 'manual' ? 'manual' : 'otomatis darurat') . ").",
            ]);

        $pdo->commit();
        return ['ok' => true, 'stok_sisa' => $stokBaru];
    } catch (Throwable $e) {
        $pdo->rollBack();
        return ['ok' => false, 'error' => 'Gagal memproses irigasi.'];
    }
}

/** Klasifikasi status VWC → 'kritis' | 'peringatan' | 'baik'. */
function status_vwc(float $vwc): string
{
    if ($vwc < 30) return 'kritis';
    if ($vwc < 45) return 'peringatan';
    return 'baik';
}
