<?php
declare(strict_types=1);

// ponytail: single load endpoint, session-scoped slot query, native json_validate(), stdlib PDO

ini_set('display_errors', '0');
error_reporting(E_ALL);

require_once __DIR__ . '/../src/bootstrap.php';

use Meiji\Infrastructure\Database\DatabaseConnection;

if (session_status() === PHP_SESSION_NONE) {
    $isSecure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (isset($_SERVER['SERVER_PORT']) && (int) $_SERVER['SERVER_PORT'] === 443);
    session_start([
        'cookie_httponly' => true,
        'cookie_samesite' => 'Lax',
        'cookie_secure' => $isSecure,
    ]);
}

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');

$userId = isset($_SESSION['user_id']) ? (int) $_SESSION['user_id'] : 0;
if ($userId <= 0) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Authentication required. Please sign in as Mayor.'], JSON_THROW_ON_ERROR);
    exit(0);
}

try {
    $container = createContainer();
    $pdo = $container->get(DatabaseConnection::class)->getPdo();

    $slotId = isset($_GET['slot_id']) ? (int) $_GET['slot_id'] : 0;

    // Fetch all slots owned by this user
    $slotsStmt = $pdo->prepare("
        SELECT id, user_id, city_name, chronicle_year, chronicle_month, population, treasury, updated_at
        FROM saved_cities
        WHERE user_id = ?
        ORDER BY updated_at DESC
    ");
    $slotsStmt->execute([$userId]);
    $slots = $slotsStmt->fetchAll();

    $selectedCity = null;

    if ($slotId > 0) {
        $cityStmt = $pdo->prepare("
            SELECT id, user_id, city_name, chronicle_year, chronicle_month, population, treasury, city_data, updated_at
            FROM saved_cities
            WHERE id = ? AND user_id = ?
            LIMIT 1
        ");
        $cityStmt->execute([$slotId, $userId]);
        $selectedCity = $cityStmt->fetch() ?: null;
    } elseif (!empty($slots)) {
        // Default to the most recent slot
        $latestId = (int) $slots[0]['id'];
        $cityStmt = $pdo->prepare("
            SELECT id, user_id, city_name, chronicle_year, chronicle_month, population, treasury, city_data, updated_at
            FROM saved_cities
            WHERE id = ? AND user_id = ?
            LIMIT 1
        ");
        $cityStmt->execute([$latestId, $userId]);
        $selectedCity = $cityStmt->fetch() ?: null;
    }

    if ($selectedCity !== null && isset($selectedCity['city_data'])) {
        $rawCityData = (string) $selectedCity['city_data'];
        if (json_validate($rawCityData)) {
            $decoded = json_decode($rawCityData, true, 512, JSON_THROW_ON_ERROR);
            $selectedCity['parsed_data'] = is_array($decoded) ? $decoded : [];
        } else {
            $selectedCity['parsed_data'] = [];
        }
    }

    echo json_encode([
        'success' => true,
        'city' => $selectedCity,
        'slots' => $slots,
    ], JSON_THROW_ON_ERROR);
    exit(0);
} catch (\Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => htmlspecialchars($e->getMessage(), ENT_QUOTES, 'UTF-8'),
    ], JSON_THROW_ON_ERROR);
    exit(0);
}
