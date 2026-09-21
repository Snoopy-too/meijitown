<?php
declare(strict_types=1);

require_once __DIR__ . '/../src/bootstrap.php';

use Meiji\Domain\Model\City;
use Meiji\Domain\Model\CityGrid;
use Meiji\Domain\Model\CityMetrics;
use Meiji\Domain\Model\Tile;
use Meiji\Infrastructure\Database\DatabaseConnection;
use Meiji\Infrastructure\Repository\PdoCityRepository;

echo "--- Testing Unified Config Repository & Persistence ---\n";

$tempConfigFile = __DIR__ . '/temp_city_config.json';
if (file_exists($tempConfigFile)) {
    unlink($tempConfigFile);
}

// Mock DatabaseConnection with in-memory SQLite for testing PdoCityRepository without running external MySQL daemon
$pdo = new PDO('sqlite::memory:');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$pdo->exec("
    CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE cities (
        city_id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        city_name TEXT NOT NULL,
        treasury INTEGER NOT NULL DEFAULT 5000,
        population INTEGER NOT NULL DEFAULT 0,
        current_year INTEGER NOT NULL DEFAULT 1872,
        current_month INTEGER NOT NULL DEFAULT 1,
        last_saved TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
");

$dbConn = new DatabaseConnection();
$refProp = new ReflectionProperty(DatabaseConnection::class, 'pdo');
$refProp->setValue($dbConn, $pdo);

$repo = new PdoCityRepository($dbConn, $tempConfigFile);

// 1. Test Seed & Reset Initial City
$city = $repo->getCity(1);
assert($city !== null, "City 1 should be initialized");
assert($city->cityName === 'Edo-Tokyo', "Default name should be Edo-Tokyo");
assert($city->treasury === 5000, "Default treasury should be 5000");
assert($city->metrics !== null, "Metrics should be loaded from config");
assert($city->metrics->traditionModernityBalance === 50, "Balance should be 50");
echo "[Pass 1/3] Seeded and loaded city 1 with metrics from config file.\n";

// 2. Test Saving City, Grid, and Metrics
$grid = new CityGrid(1, 32, 32);
$grid->setTile(new Tile(5, 5, Tile::TYPE_ROAD));
$grid->setTile(new Tile(6, 6, Tile::TYPE_ZONE, Tile::ZONE_RESIDENTIAL, 1, true, Tile::STAGE_BUILT));

$city->treasury = 8200;
$city->population = 140;
$city->metrics->traditionModernityBalance = 65;
$city->metrics->fireRisk = 15;

$repo->saveCityAndGrid($city, $grid);

// Verify config file was written
assert(file_exists($tempConfigFile), "Config file must exist on disk");
$configJson = json_decode((string) file_get_contents($tempConfigFile), true);
assert(isset($configJson['cities']['1']), "City 1 entry must exist in config JSON");
assert(count($configJson['cities']['1']['tiles']) === 2, "Config must contain 2 saved tiles");
assert($configJson['cities']['1']['metrics']['tradition_modernity_balance'] === 65, "Config metrics must reflect 65");
echo "[Pass 2/3] Successfully saved grid and metrics to config file and DB.\n";

// 3. Test Reloading
$reloadedCity = $repo->getCity(1);
assert($reloadedCity->treasury === 8200, "Reloaded treasury should be 8200");
assert($reloadedCity->metrics->traditionModernityBalance === 65, "Reloaded metric should be 65");

$reloadedGrid = $repo->getGrid(1);
assert($reloadedGrid !== null, "Reloaded grid should exist");
$roadTile = $reloadedGrid->getTile(5, 5);
assert($roadTile !== null && $roadTile->type === Tile::TYPE_ROAD, "Road tile should match");
$resTile = $reloadedGrid->getTile(6, 6);
assert($resTile !== null && $resTile->zoneType === Tile::ZONE_RESIDENTIAL, "Residential tile should match");
echo "[Pass 3/3] Successfully reloaded grid and metrics from config file.\n";

if (file_exists($tempConfigFile)) {
    unlink($tempConfigFile);
}

echo "\n--- ALL CONFIG PERSISTENCE TESTS PASSED! ---\n";
