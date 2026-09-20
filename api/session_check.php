<?php
declare(strict_types=1);

// ponytail: shared session contract, native PHP session, zero framework dependencies

if (session_status() === PHP_SESSION_NONE) {
    session_start([
        'cookie_httponly' => true,
        'cookie_samesite' => 'Lax',
    ]);
}

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');

if (isset($_SESSION['user_id']) && (int) $_SESSION['user_id'] > 0) {
    echo json_encode([
        'authenticated' => true,
        'user_id' => (int) $_SESSION['user_id'],
        'username' => (string) ($_SESSION['username'] ?? 'Mayor'),
    ], JSON_THROW_ON_ERROR);
    exit(0);
}

echo json_encode([
    'authenticated' => false,
], JSON_THROW_ON_ERROR);
exit(0);
