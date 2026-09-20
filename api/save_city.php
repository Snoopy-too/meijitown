<?php
declare(strict_types=1);

// ponytail: single save endpoint, strict session auth, INSERT ... ON DUPLICATE KEY UPDATE

require_once __DIR__ . '/../src/bootstrap.php';

use Meiji\Infrastructure\Database\DatabaseConnection;

if (session_status() === PHP_SESSION_NONE) {
    session_start([
        'cookie_httponly' => true,
        'cookie_samesite' => 'Lax',
    ]);
}

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method Not Allowed. Use POST.'], JSON_THROW_ON_ERROR);
    exit(0);
}

// 1. Strict Session Authentication
$userId = isset($_SESSION['user_id']) ? (int) $_SESSION['user_id'] : 0;
if ($userId <= 0) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Authentication required. Please sign in as Mayor.'], JSON_THROW_ON_ERROR);
    exit(0);
}

try {
    $raw = file_get_contents('php://input');
    if (empty($raw)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Empty request payload.'], JSON_THROW_ON_ERROR);
        exit(0);
    }

    $payload = json_decode((string) $raw, true, 512, JSON_THROW_ON_ERROR);
    if (!is_array($payload)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid JSON payload.'], JSON_THROW_ON_ERROR);
        exit(0);
    }

    // 2. Validate JSON payload (grid arrays, treasury, population, chronicle date, active edicts)
    $grid = $payload['grid'] ?? $payload['tiles'] ?? null;
    if (!is_array($grid)) {
        http_response_code(422);
        echo json_encode(['success' => false, 'error' => 'Payload missing valid grid/tiles array.'], JSON_THROW_ON_ERROR);
        exit(0);
    }

    $treasury = isset($payload['treasury']) ? (int) $payload['treasury'] : 5000;
    $population = isset($payload['population']) ? (int) $payload['population'] : 0;

    // Chronicle date validation
    if (isset($payload['chronicleDate']) && is_array($payload['chronicleDate'])) {
        $chronicleYear = (int) ($payload['chronicleDate']['year'] ?? 1872);
        $chronicleMonth = (int) ($payload['chronicleDate']['month'] ?? 1);
    } else {
        $chronicleYear = (int) ($payload['chronicleYear'] ?? 1872);
        $chronicleMonth = (int) ($payload['chronicleMonth'] ?? 1);
    }

    if ($chronicleMonth < 1 || $chronicleMonth > 12) {
        $chronicleMonth = 1;
    }

    $activeEdicts = is_array($payload['activeEdicts'] ?? null) ? $payload['activeEdicts'] : [];
    $cityName = trim((string) ($payload['cityName'] ?? 'Edo-Tokyo'));
    if ($cityName === '') {
        $cityName = 'Edo-Tokyo';
    }

    $metrics = is_array($payload['metrics'] ?? null) ? $payload['metrics'] : [];

    // Full serialized city_data package
    $cityDataArray = [
        'grid' => $grid,
        'activeEdicts' => $activeEdicts,
        'metrics' => $metrics,
        'savedAt' => date('Y-m-d H:i:s'),
    ];
    $cityDataJson = json_encode($cityDataArray, JSON_THROW_ON_ERROR);

    $container = createContainer();
    $pdo = $container->get(DatabaseConnection::class)->getPdo();

    // 3. Determine Slot ID for INSERT ... ON DUPLICATE KEY UPDATE
    $targetSlotId = isset($payload['slotId']) && (int) $payload['slotId'] > 0 ? (int) $payload['slotId'] : null;

    if ($targetSlotId !== null) {
        // Verify user owns this slot
        $checkStmt = $pdo->prepare("SELECT id FROM saved_cities WHERE id = ? AND user_id = ?");
        $checkStmt->execute([$targetSlotId, $userId]);
        if (!$checkStmt->fetch()) {
            $targetSlotId = null; // Unowned slot: insert new
        }
    }

    // If slotId wasn't passed, check if the user has an existing default slot
    if ($targetSlotId === null && empty($payload['createNewSlot'])) {
        $existingStmt = $pdo->prepare("SELECT id FROM saved_cities WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1");
        $existingStmt->execute([$userId]);
        $existingRow = $existingStmt->fetch();
        if ($existingRow) {
            $targetSlotId = (int) $existingRow['id'];
        }
    }

    // 4. Execute INSERT ... ON DUPLICATE KEY UPDATE
    $stmt = $pdo->prepare("
        INSERT INTO saved_cities 
            (id, user_id, city_name, chronicle_year, chronicle_month, population, treasury, city_data)
        VALUES 
            (:id, :user_id, :city_name, :chronicle_year, :chronicle_month, :population, :treasury, :city_data)
        ON DUPLICATE KEY UPDATE
            city_name = VALUES(city_name),
            chronicle_year = VALUES(chronicle_year),
            chronicle_month = VALUES(chronicle_month),
            population = VALUES(population),
            treasury = VALUES(treasury),
            city_data = VALUES(city_data),
            updated_at = CURRENT_TIMESTAMP
    ");

    $stmt->execute([
        ':id' => $targetSlotId,
        ':user_id' => $userId,
        ':city_name' => $cityName,
        ':chronicle_year' => $chronicleYear,
        ':chronicle_month' => $chronicleMonth,
        ':population' => $population,
        ':treasury' => $treasury,
        ':city_data' => $cityDataJson,
    ]);

    $savedSlotId = $targetSlotId ?: (int) $pdo->lastInsertId();

    echo json_encode([
        'success' => true,
        'slot_id' => $savedSlotId,
        'cityName' => $cityName,
        'tilesCount' => count($grid),
        'message' => "Settlement '{$cityName}' saved successfully to MySQL (Slot #{$savedSlotId}).",
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
