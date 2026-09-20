<?php
declare(strict_types=1);

// ponytail: single runnable test check, native asserts, zero test framework dependencies
assert_options(ASSERT_ACTIVE, 1);
assert_options(ASSERT_BAIL, 1);

require_once __DIR__ . '/../src/bootstrap.php';

use Meiji\Application\UseCase\GetCityStateUseCase;
use Meiji\Application\UseCase\SaveCityGridUseCase;
use Meiji\Domain\Model\Tile;
use Meiji\Infrastructure\Container\Container;
use Meiji\Infrastructure\Database\DatabaseConnection;

echo "--- Starting Project Meiji Backend Self-Check ---\n";

// 1. Test Container & Dependency Injection
$container = createContainer();
assert($container instanceof Container, "Container should be instance of Container");
$db = $container->get(DatabaseConnection::class);
assert($db instanceof DatabaseConnection, "Container should resolve DatabaseConnection");
$pdo = $db->getPdo();
assert($pdo instanceof PDO, "PDO connection should be active");
echo "[Pass 1/4] Dependency Injection Container wired and resolved.\n";

// 2. Test Domain Validation
$tile = new Tile(5, 5, Tile::TYPE_ROAD);
assert($tile->x === 5 && $tile->y === 5, "Tile coordinates should match");
assert($tile->type === Tile::TYPE_ROAD, "Tile type should be road");

$scaffoldTile = new Tile(6, 6, Tile::TYPE_ZONE, Tile::ZONE_RESIDENTIAL, 0, true, Tile::STAGE_SCAFFOLDING);
assert($scaffoldTile->occupied === true, "Tile occupied should be true");
assert($scaffoldTile->stage === Tile::STAGE_SCAFFOLDING, "Tile stage should be scaffolding");

$watchtowerTile = new Tile(7, 7, Tile::TYPE_SERVICE, null, 1, true, Tile::STAGE_BUILT, 'watchtower');
assert($watchtowerTile->type === Tile::TYPE_SERVICE, "Tile type should be service");
assert($watchtowerTile->serviceType === 'watchtower', "Service type should be watchtower");

$fireTile = new Tile(8, 8, Tile::TYPE_ZONE, Tile::ZONE_RESIDENTIAL, 1, true, Tile::STAGE_ON_FIRE);
assert($fireTile->stage === Tile::STAGE_ON_FIRE, "Tile stage should be on_fire");

// Test Rotation Invariants
$rotatedTile = new Tile(9, 9, Tile::TYPE_SERVICE, null, 1, true, Tile::STAGE_BUILT, 'train_depot', 1, false, null, 2);
assert($rotatedTile->rotation === 2, "Tile rotation should be 2");

$invalidRotCaught = false;
try {
    new Tile(9, 9, Tile::TYPE_SERVICE, null, 1, true, Tile::STAGE_BUILT, 'train_depot', 1, false, null, 5);
} catch (InvalidArgumentException $e) {
    $invalidRotCaught = true;
}
assert($invalidRotCaught, "Rotation > 3 must throw InvalidArgumentException");

$invalidCaught = false;
try {
    new Tile(-1, 0, Tile::TYPE_ROAD);
} catch (InvalidArgumentException $e) {
    $invalidCaught = true;
}
assert($invalidCaught, "Negative coordinate must throw InvalidArgumentException");
echo "[Pass 2/4] Domain Value Object invariants enforced.\n";

// 3. Test SaveCityGridUseCase
/** @var SaveCityGridUseCase $saveUseCase */
$saveUseCase = $container->get(SaveCityGridUseCase::class);

$sampleTiles = [
    ['x' => 10, 'y' => 10, 'type' => 'road'],
    ['x' => 10, 'y' => 11, 'type' => 'zone', 'zoneType' => 'residential', 'level' => 2, 'occupied' => true, 'stage' => 'built'],
    ['x' => 11, 'y' => 10, 'type' => 'zone', 'zoneType' => 'commercial', 'level' => 0, 'occupied' => true, 'stage' => 'scaffolding'],
    ['x' => 12, 'y' => 10, 'type' => 'zone', 'zoneType' => 'industrial', 'level' => 0, 'occupied' => false, 'stage' => 'none'],
    ['x' => 13, 'y' => 10, 'type' => 'service', 'level' => 1, 'occupied' => true, 'stage' => 'built', 'serviceType' => 'watchtower'],
    ['x' => 14, 'y' => 10, 'type' => 'zone', 'zoneType' => 'residential', 'level' => 1, 'occupied' => true, 'stage' => 'on_fire'],
    ['x' => 15, 'y' => 10, 'type' => 'canal', 'hasBridge' => true],
    ['x' => 16, 'y' => 10, 'type' => 'rail'],
    ['x' => 17, 'y' => 10, 'type' => 'park', 'subType' => 'willow'],
    ['x' => 18, 'y' => 10, 'type' => 'service', 'serviceType' => 'train_depot', 'rotation' => 1],
    ['x' => 19, 'y' => 10, 'type' => 'service', 'serviceType' => 'koban', 'rotation' => 3],
];

$saveResult = $saveUseCase->execute(
    cityId: 1,
    tilesData: $sampleTiles,
    width: 32,
    height: 32,
    treasury: 14500,
    population: 150
);

assert($saveResult['success'] === true, "SaveCityGridUseCase must succeed");
assert($saveResult['tilesCount'] === 11, "Grid must persist 11 tiles");
assert($saveResult['city']['treasury'] === 14500, "Treasury should update to 14500");
echo "[Pass 3/4] SaveCityGridUseCase successfully committed transaction to MariaDB.\n";

// 4. Test GetCityStateUseCase
/** @var GetCityStateUseCase $getUseCase */
$getUseCase = $container->get(GetCityStateUseCase::class);
$state = $getUseCase->execute(1);

assert($state['city']['cityId'] === 1, "City ID should be 1");
assert($state['city']['treasury'] === 14500, "Retrieved treasury should be 14500");
assert(isset($state['grid']['tiles']['10_10']), "Tile 10_10 (road) must exist in grid");
assert($state['grid']['tiles']['10_10']['type'] === 'road', "Tile 10_10 must be road");
assert(isset($state['grid']['tiles']['10_11']), "Tile 10_11 (residential) must exist in grid");
assert($state['grid']['tiles']['10_11']['zoneType'] === 'residential', "Tile 10_11 must be residential");
assert($state['grid']['tiles']['10_11']['occupied'] === true, "Tile 10_11 must be occupied");
assert($state['grid']['tiles']['10_11']['stage'] === 'built', "Tile 10_11 must have built stage");
assert($state['grid']['tiles']['11_10']['stage'] === 'scaffolding', "Tile 11_10 must have scaffolding stage");
assert($state['grid']['tiles']['13_10']['type'] === 'service', "Tile 13_10 must be service");
assert($state['grid']['tiles']['13_10']['serviceType'] === 'watchtower', "Tile 13_10 serviceType must be watchtower");
assert($state['grid']['tiles']['14_10']['stage'] === 'on_fire', "Tile 14_10 stage must be on_fire");
assert(isset($state['grid']['tiles']['18_10']), "Tile 18_10 (Train Depot) must exist in grid");
assert($state['grid']['tiles']['18_10']['rotation'] === 1, "Tile 18_10 (Train Depot) rotation must be 1");
assert(isset($state['grid']['tiles']['19_10']), "Tile 19_10 (Koban) must exist in grid");
assert($state['grid']['tiles']['19_10']['rotation'] === 3, "Tile 19_10 (Koban) rotation must be 3");

echo "[Pass 4/5] GetCityStateUseCase retrieved and hydrated state correctly.\n";

// 5. Test Multi-User Auth & Saved Cities Use Cases
use Meiji\Application\UseCase\AuthUserUseCase;
use Meiji\Application\UseCase\ManageSavedCitiesUseCase;

/** @var AuthUserUseCase $authUseCase */
$authUseCase = $container->get(AuthUserUseCase::class);
$testUser = 'test_mayor_' . time();
$user = $authUseCase->register($testUser, 'meiji1868');
assert($user['id'] > 0, "Registered user must have valid ID");
assert($user['username'] === $testUser, "Username should match");

$login = $authUseCase->login($testUser, 'meiji1868');
assert($login !== null && $login['id'] === $user['id'], "Login must succeed with valid credentials");

/** @var ManageSavedCitiesUseCase $savedCitiesUseCase */
$savedCitiesUseCase = $container->get(ManageSavedCitiesUseCase::class);
$slotId = $savedCitiesUseCase->saveCity(
    userId: $user['id'],
    cityName: 'Edo Imperial Haven',
    chronicleYear: 1874,
    chronicleMonth: 5,
    population: 320,
    treasury: 12400,
    cityData: json_encode(['tiles' => $sampleTiles], JSON_THROW_ON_ERROR)
);
assert($slotId > 0, "SaveCity must return positive slot ID");

$userCities = $savedCitiesUseCase->listCities($user['id']);
assert(count($userCities) >= 1, "User cities list must contain saved city");
assert($userCities[0]['cityName'] === 'Edo Imperial Haven', "City name must match");

$loadedCity = $savedCitiesUseCase->getCity($slotId, $user['id']);
assert($loadedCity !== null, "Loaded city must not be null");
assert($loadedCity['population'] === 320, "Loaded city population should be 320");
assert($loadedCity['treasury'] === 12400, "Loaded city treasury should be 12400");

$delResult = $savedCitiesUseCase->deleteCity($slotId, $user['id']);
assert($delResult === true, "Delete city must return true");

echo "[Pass 5/5] Multi-User Auth & Saved Cities persistence verified successfully.\n";
echo "--- ALL 5 TESTS PASSED SUCCESSFULLY! ---\n";
