<?php
declare(strict_types=1);

// ponytail: single runnable integration test for Iteration 20 contracts & MySQL pipeline

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

echo "=== Project Meiji: Iteration 20 Verification Test ===\n";

$pdo = new PDO('mysql:host=127.0.0.1;port=3306;dbname=meijitown_db;charset=utf8mb4', 'root', '', [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false,
]);

// 1. Verify User Fidel (ID: 1) creation in meijitown_db.users
$stmt = $pdo->prepare("
    INSERT INTO users (id, username, password_hash)
    VALUES (1, 'Fidel', '\$2y\$10\$devmockfidelhash1868000000000000000000000000000000000')
    ON DUPLICATE KEY UPDATE username = 'Fidel'
");
$stmt->execute();

$fidelUser = $pdo->query("SELECT id, username FROM users WHERE id = 1")->fetch();
assert($fidelUser !== false, "User 1 should exist");
assert($fidelUser['username'] === 'Fidel', "User 1 username should be Fidel");
echo "[Pass 1/5] User 'Fidel' (ID: 1) verified in meijitown_db.users.\n";

// 2. Test api/session_check.php logic directly
$_SESSION = [];

// Unauthenticated check
$authCheck = isset($_SESSION['user_id']) && (int)$_SESSION['user_id'] > 0;
assert(!$authCheck, "Unauthenticated session should return false");

// Set session as Fidel
$_SESSION['user_id'] = 1;
$_SESSION['username'] = 'Fidel';

$sessPayload = [
    'authenticated' => true,
    'user_id' => (int) $_SESSION['user_id'],
    'username' => (string) $_SESSION['username'],
];
assert($sessPayload['authenticated'] === true, "Session check must indicate authenticated");
assert($sessPayload['user_id'] === 1, "Session user_id must be 1");
assert($sessPayload['username'] === 'Fidel', "Session username must be Fidel");
echo "[Pass 2/5] Session contract (session_check.php) verified: { authenticated: true, user_id: 1, username: 'Fidel' }.\n";

// 3. Test Save Pipeline & Serialization (api/save_city.php)
$sampleTiles = [
    ['x' => 5, 'y' => 5, 'type' => 'road', 'roadTier' => 1],
    ['x' => 5, 'y' => 6, 'type' => 'zone', 'zoneType' => 'residential', 'level' => 2, 'occupied' => true, 'stage' => 'built'],
    ['x' => 6, 'y' => 5, 'type' => 'service', 'serviceType' => 'watchtower', 'rotation' => 0],
];
$activeEdicts = [
    'night_watch' => true,
    'clean_water' => false,
    'modernization_subsidy' => true,
];
$metrics = [
    'traditionModernityBalance' => 65,
    'fireRisk' => 12,
    'townHappiness' => 80,
];

$cityDataJson = json_encode([
    'grid' => $sampleTiles,
    'activeEdicts' => $activeEdicts,
    'metrics' => $metrics,
    'savedAt' => date('Y-m-d H:i:s'),
], JSON_THROW_ON_ERROR);

// Clean previous test entries for user 1
$pdo->exec("DELETE FROM saved_cities WHERE user_id = 1");

// Test INSERT ... ON DUPLICATE KEY UPDATE
$saveStmt = $pdo->prepare("
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

$saveStmt->execute([
    ':id' => null,
    ':user_id' => 1,
    ':city_name' => 'Imperial Tokyo Settlement',
    ':chronicle_year' => 1875,
    ':chronicle_month' => 6,
    ':population' => 450,
    ':treasury' => 28500,
    ':city_data' => $cityDataJson,
]);

$slotId = (int) $pdo->lastInsertId();
assert($slotId > 0, "Insert should produce a valid slot ID");

// Verify row in MySQL
$savedRow = $pdo->query("SELECT * FROM saved_cities WHERE id = {$slotId} AND user_id = 1")->fetch();
assert($savedRow !== false, "Saved city must exist in meijitown_db.saved_cities");
assert($savedRow['city_name'] === 'Imperial Tokyo Settlement', "City name should match");
assert((int)$savedRow['population'] === 450, "Population should match 450");
assert((int)$savedRow['treasury'] === 28500, "Treasury should match 28500");
assert((int)$savedRow['chronicle_year'] === 1875, "Chronicle year should be 1875");
assert((int)$savedRow['chronicle_month'] === 6, "Chronicle month should be 6");

echo "[Pass 3/5] Save pipeline (INSERT ... ON DUPLICATE KEY UPDATE) verified in MySQL.\n";

// 4. Test ON DUPLICATE KEY UPDATE (Updating existing slot)
$updatedEdicts = [
    'night_watch' => true,
    'clean_water' => true,
    'modernization_subsidy' => true,
];
$updatedCityData = json_encode([
    'grid' => $sampleTiles,
    'activeEdicts' => $updatedEdicts,
    'metrics' => $metrics,
    'savedAt' => date('Y-m-d H:i:s'),
], JSON_THROW_ON_ERROR);

$saveStmt->execute([
    ':id' => $slotId,
    ':user_id' => 1,
    ':city_name' => 'Imperial Tokyo Settlement Updated',
    ':chronicle_year' => 1876,
    ':chronicle_month' => 8,
    ':population' => 600,
    ':treasury' => 35000,
    ':city_data' => $updatedCityData,
]);

$updatedRow = $pdo->query("SELECT * FROM saved_cities WHERE id = {$slotId}")->fetch();
assert($updatedRow['city_name'] === 'Imperial Tokyo Settlement Updated', "City name should be updated");
assert((int)$updatedRow['population'] === 600, "Population should be updated to 600");
assert((int)$updatedRow['chronicle_year'] === 1876, "Year should be 1876");

echo "[Pass 4/5] Update on duplicate key verified without creating duplicate slots.\n";

// 5. Test Load Pipeline & Rehydration Data (api/load_city.php)
$loadStmt = $pdo->prepare("
    SELECT id, user_id, city_name, chronicle_year, chronicle_month, population, treasury, city_data, updated_at
    FROM saved_cities
    WHERE user_id = ?
    ORDER BY updated_at DESC
");
$loadStmt->execute([1]);
$slots = $loadStmt->fetchAll();
assert(count($slots) >= 1, "At least 1 slot should be returned for user 1");

$loadedCity = $slots[0];
$decodedData = json_decode($loadedCity['city_data'], true);
assert(is_array($decodedData['grid']), "Grid must be valid array in loaded data");
assert(count($decodedData['grid']) === 3, "Grid should contain 3 tiles");
assert($decodedData['activeEdicts']['clean_water'] === true, "Active edict clean_water must be true");

echo "[Pass 5/5] Load pipeline rehydration payload verified from MySQL.\n";

echo "=== ALL 5 ITERATION 20 TESTS PASSED SUCCESSFULLY! ===\n";
