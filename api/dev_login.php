<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');

try {
    $remoteAddr = (string) ($_SERVER['REMOTE_ADDR'] ?? '');
    if ($remoteAddr !== '127.0.0.1' && $remoteAddr !== '::1') {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Dev switcher forbidden on non-local addresses.']);
        exit;
    }

    if (session_status() === PHP_SESSION_NONE) {
        session_start([
            'cookie_httponly' => true,
            'cookie_samesite' => 'Lax',
        ]);
    }

    $raw = file_get_contents('php://input');
    $payload = !empty($raw) ? json_decode($raw, true) : [];
    $profile = strtolower((string) ($payload['profile'] ?? $_GET['profile'] ?? 'fidel'));

    if ($profile === 'guest') {
        unset($_SESSION['user_id'], $_SESSION['username']);
        echo json_encode([
            'success' => true,
            'authenticated' => false,
            'username' => 'Guest',
        ]);
        exit;
    }

    // Default or 'fidel': Profile Fidel (ID: 1)
    $pdo = new PDO('mysql:host=127.0.0.1;port=3306;dbname=meijitown_db;charset=utf8mb4', 'root', '', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);

    // Ensure User 1 exists with username 'Fidel' using parameter binding to avoid string interpolation warnings
    $stmt = $pdo->prepare('
        INSERT INTO users (id, username, password_hash)
        VALUES (1, :username, :hash)
        ON DUPLICATE KEY UPDATE username = VALUES(username)
    ');
    $stmt->execute([
        ':username' => 'Fidel',
        ':hash' => '$2y$10$devmockfidelhash1868000000000000000000000000000000000',
    ]);

    $_SESSION['user_id'] = 1;
    $_SESSION['username'] = 'Fidel';

    echo json_encode([
        'success' => true,
        'authenticated' => true,
        'user_id' => 1,
        'username' => 'Fidel',
    ]);
    exit;
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    exit;
}
