<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');

require_once __DIR__ . '/../src/bootstrap.php';

use Meiji\Infrastructure\Database\DatabaseConnection;

try {
    if (session_status() === PHP_SESSION_NONE) {
        session_start([
            'cookie_httponly' => true,
            'cookie_samesite' => 'Lax',
        ]);
    }

    $raw = file_get_contents('php://input');
    $payload = !empty($raw) ? json_decode((string) $raw, true) : [];
    $profile = strtolower((string) ($payload['profile'] ?? $_GET['profile'] ?? 'fidel'));

    if ($profile === 'guest') {
        unset($_SESSION['user_id'], $_SESSION['username']);
        echo json_encode([
            'success' => true,
            'authenticated' => false,
            'username' => 'Guest',
        ], JSON_THROW_ON_ERROR);
        exit(0);
    }

    $profiles = [
        'fidel' => [
            'id' => 1,
            'username' => 'Fidel',
            'hash' => '$2y$10$devmockfidelhash1868000000000000000000000000000000000',
        ],
        'mia' => [
            'id' => 2,
            'username' => 'Mia',
            'hash' => '$2y$10$devmockmiahash18680000000000000000000000000000000000',
        ],
    ];

    $selected = $profiles[$profile] ?? $profiles['fidel'];

    $container = createContainer();
    $pdo = $container->get(DatabaseConnection::class)->getPdo();

    // Ensure saved_cities table exists
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `saved_cities` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `user_id` INT NOT NULL,
            `city_name` VARCHAR(100) NOT NULL,
            `chronicle_year` INT NOT NULL,
            `chronicle_month` INT NOT NULL,
            `population` INT NOT NULL,
            `treasury` INT NOT NULL,
            `city_data` LONGTEXT NOT NULL,
            `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    // Detect ID column name in users table ('id' or 'user_id')
    $cols = $pdo->query("SHOW COLUMNS FROM users")->fetchAll(PDO::FETCH_COLUMN);
    $idCol = (in_array('user_id', $cols, true) && !in_array('id', $cols, true)) ? 'user_id' : 'id';

    // Check if user already exists
    $stmt = $pdo->prepare("SELECT {$idCol} AS id, username FROM users WHERE username = :username LIMIT 1");
    $stmt->execute([':username' => $selected['username']]);
    $existing = $stmt->fetch();

    $userId = $selected['id'];
    if ($existing) {
        $userId = (int) $existing['id'];
    } else {
        try {
            $insert = $pdo->prepare("
                INSERT INTO users ({$idCol}, username, password_hash)
                VALUES (:id, :username, :hash)
                ON DUPLICATE KEY UPDATE username = VALUES(username)
            ");
            $insert->execute([
                ':id' => $selected['id'],
                ':username' => $selected['username'],
                ':hash' => $selected['hash'],
            ]);
        } catch (Throwable $e) {
            $fallback = $pdo->prepare('INSERT INTO users (username, password_hash) VALUES (:username, :hash)');
            $fallback->execute([
                ':username' => $selected['username'],
                ':hash' => $selected['hash'],
            ]);
            $userId = (int) $pdo->lastInsertId();
        }
    }

    $_SESSION['user_id'] = $userId;
    $_SESSION['username'] = $selected['username'];

    echo json_encode([
        'success' => true,
        'authenticated' => true,
        'user_id' => $userId,
        'username' => $selected['username'],
    ], JSON_THROW_ON_ERROR);
    exit(0);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()], JSON_THROW_ON_ERROR);
    exit(0);
}
