<?php
/**
 * Konfigurasi koneksi database HyMupen.
 * Default cocok untuk XAMPP/Laragon (host=localhost, user=root, password kosong).
 * Sesuaikan jika pengaturan phpMyAdmin/MySQL kamu berbeda.
 */

define('DB_HOST', 'localhost');
define('DB_NAME', 'hymupen');
define('DB_USER', 'root');
define('DB_PASS', '');

/**
 * Ambil koneksi PDO (singleton per-request).
 */
function db(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        try {
            $pdo = new PDO(
                'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
                DB_USER,
                DB_PASS,
                [
                    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES   => false,
                ]
            );
        } catch (PDOException $e) {
            http_response_code(500);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode([
                'ok'    => false,
                'error' => 'Koneksi database gagal. Pastikan MySQL aktif dan database "hymupen" sudah dibuat (import database/schema.sql lewat phpMyAdmin).',
            ]);
            exit;
        }
    }
    return $pdo;
}
