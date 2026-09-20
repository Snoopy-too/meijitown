<?php
declare(strict_types=1);

// ponytail: single load endpoint, session-scoped slot query, stdlib PDO

if (session_status() === PHP_SESSION_NONE) {
    session_start([
        'cookie_httponly' => true,
        'cookie_samesite' => 'Lax',
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
    $pdo = new PDO('mysql:host=127.0.0.1;port=3306;dbname=meijitown_db;charset=utf8mb4', 'root', '', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);

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
        $decoded = json_decode((string) $selectedCity['city_data'], true);
        $selectedCity['parsed_data'] = is_array($decoded) ? $decoded : [];
    }

    echo json_encode([
        'success' => true,
        'city' => $selectedCity,
        'slots' => $slots,
    ], JSON_THROW_ON_ERROR);
    exit(0);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => htmlspecialchars($e->getMessage(), ENT_QUOTES, 'UTF-8'),
    ], JSON_THROW_ON_ERROR);
    exit(0);
}
