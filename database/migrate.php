<?php
declare(strict_types=1);

// ponytail: stdlib PDO migration script, zero external dependencies

$host = '127.0.0.1';
$port = 3306;
$user = 'root';
$pass = '';

try {
    $pdo = new PDO("mysql:host={$host};port={$port};charset=utf8mb4", $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);

    $sqlFile = __DIR__ . '/schema.sql';
    if (!file_exists($sqlFile)) {
        throw new RuntimeException("Schema file not found at: {$sqlFile}");
    }

    $stripBom = static fn(string $s): string => preg_replace('/^\xEF\xBB\xBF/', '', $s);
    $sql = $stripBom(file_get_contents($sqlFile));
    $pdo->exec($sql);
    $pdo->exec("USE `meijitown`;");

    echo "[Migration] Database `meijitown` and InnoDB tables verified successfully.\n";

    // Apply Migration v2 (meijitown_db & saved_cities)
    $v2File = __DIR__ . '/migration_v2.sql';
    if (file_exists($v2File)) {
        $sqlV2 = $stripBom(file_get_contents($v2File));
        $pdo->exec($sqlV2);
        echo "[Migration] Database `meijitown_db` (users, saved_cities) migrated successfully.\n";
    }

    $pdo->exec("USE `meijitown`;");

    // Seed default user if none exists
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM users");
    $userCount = (int) $stmt->fetch()['count'];

    if ($userCount === 0) {
        $passHash = password_hash('meiji1868', PASSWORD_DEFAULT);
        $insertUser = $pdo->prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)");
        $insertUser->execute(['mayor', $passHash]);
        $userId = (int) $pdo->lastInsertId();
        echo "[Seed] Created default user 'mayor' (ID: {$userId}).\n";

        // Seed default city
        $insertCity = $pdo->prepare("INSERT INTO cities (user_id, city_name, treasury, population, current_year, current_month) VALUES (?, ?, ?, ?, ?, ?)");
        $insertCity->execute([$userId, 'Edo-Tokyo', 15000, 120, 1872, 1]);
        $cityId = (int) $pdo->lastInsertId();

        // Seed initial empty 32x32 grid
        $defaultTiles = [];
        $insertGrid = $pdo->prepare("INSERT INTO city_grids (city_id, grid_width, grid_height, tile_data) VALUES (?, ?, ?, ?)");
        $insertGrid->execute([$cityId, 32, 32, json_encode($defaultTiles, JSON_THROW_ON_ERROR)]);

        // Seed initial metrics
        $insertMetrics = $pdo->prepare("INSERT INTO city_metrics (city_id, tradition_modernity_balance, fire_risk, cholera_risk, industrial_demand, commercial_demand, residential_demand) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $insertMetrics->execute([$cityId, 50, 25, 15, 30, 40, 60]);

        echo "[Seed] Created default city 'Edo-Tokyo' (City ID: {$cityId}) with initial 32x32 grid.\n";
    } else {
        echo "[Migration] Seed data already present.\n";
    }

    echo "[Success] Migration completed.\n";
    exit(0);
} catch (Throwable $e) {
    fwrite(STDERR, "[Error] Migration failed: " . $e->getMessage() . "\n");
    exit(1);
}
