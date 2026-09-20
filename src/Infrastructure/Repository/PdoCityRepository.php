<?php
declare(strict_types=1);

namespace Meiji\Infrastructure\Repository;

use Meiji\Domain\Model\City;
use Meiji\Domain\Model\CityGrid;
use Meiji\Domain\Model\CityMetrics;
use Meiji\Domain\Repository\CityRepositoryInterface;
use Meiji\Infrastructure\Database\DatabaseConnection;
use PDO;
use RuntimeException;

final class PdoCityRepository implements CityRepositoryInterface
{
    private PDO $pdo;

    public function __construct(DatabaseConnection $connection)
    {
        $this->pdo = $connection->getPdo();
    }

    public function getCity(int $cityId): ?City
    {
        $stmt = $this->pdo->prepare("
            SELECT c.*, 
                   m.tradition_modernity_balance, m.fire_risk, m.cholera_risk,
                   m.industrial_demand, m.commercial_demand, m.residential_demand
            FROM cities c
            LEFT JOIN city_metrics m ON c.city_id = m.city_id
            WHERE c.city_id = ?
        ");
        $stmt->execute([$cityId]);
        $row = $stmt->fetch();

        if (!$row) {
            if ($cityId === 1) {
                return $this->seedInitialCity(1);
            }
            return null;
        }

        $metrics = null;
        if ($row['tradition_modernity_balance'] !== null) {
            $metrics = CityMetrics::fromArray($cityId, $row);
        }

        return new City(
            cityId: (int) $row['city_id'],
            userId: (int) $row['user_id'],
            cityName: (string) $row['city_name'],
            treasury: (int) $row['treasury'],
            population: (int) $row['population'],
            currentYear: (int) $row['current_year'],
            currentMonth: (int) $row['current_month'],
            lastSaved: (string) ($row['last_saved'] ?? ''),
            metrics: $metrics
        );
    }

    public function getGrid(int $cityId): ?CityGrid
    {
        $stmt = $this->pdo->prepare("SELECT grid_width, grid_height, tile_data FROM city_grids WHERE city_id = ?");
        $stmt->execute([$cityId]);
        $row = $stmt->fetch();

        if (!$row) {
            return null;
        }

        $tileData = json_decode((string) $row['tile_data'], true, 512, JSON_THROW_ON_ERROR);
        if (!is_array($tileData)) {
            $tileData = [];
        }

        return CityGrid::fromArray(
            cityId: $cityId,
            width: (int) $row['grid_width'],
            height: (int) $row['grid_height'],
            data: $tileData
        );
    }

    public function saveCityAndGrid(City $city, CityGrid $grid): void
    {
        $this->pdo->beginTransaction();
        try {
            // 1. Update City basic attributes
            $cityStmt = $this->pdo->prepare("
                UPDATE cities 
                SET treasury = ?, population = ?, current_year = ?, current_month = ?, last_saved = CURRENT_TIMESTAMP
                WHERE city_id = ?
            ");
            $cityStmt->execute([
                $city->treasury,
                $city->population,
                $city->currentYear,
                $city->currentMonth,
                $city->cityId,
            ]);

            // 2. Update Metrics if present
            if ($city->metrics !== null) {
                $metricStmt = $this->pdo->prepare("
                    INSERT INTO city_metrics (city_id, tradition_modernity_balance, fire_risk, cholera_risk, industrial_demand, commercial_demand, residential_demand)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE 
                        tradition_modernity_balance = VALUES(tradition_modernity_balance),
                        fire_risk = VALUES(fire_risk),
                        cholera_risk = VALUES(cholera_risk),
                        industrial_demand = VALUES(industrial_demand),
                        commercial_demand = VALUES(commercial_demand),
                        residential_demand = VALUES(residential_demand)
                ");
                $metricStmt->execute([
                    $city->cityId,
                    $city->metrics->traditionModernityBalance,
                    $city->metrics->fireRisk,
                    $city->metrics->choleraRisk,
                    $city->metrics->industrialDemand,
                    $city->metrics->commercialDemand,
                    $city->metrics->residentialDemand,
                ]);
            }

            // 3. Save Grid Tiles
            $jsonTiles = json_encode($grid->toArray(), JSON_THROW_ON_ERROR);
            $gridStmt = $this->pdo->prepare("
                INSERT INTO city_grids (city_id, grid_width, grid_height, tile_data)
                VALUES (?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    grid_width = VALUES(grid_width),
                    grid_height = VALUES(grid_height),
                    tile_data = VALUES(tile_data)
            ");
            $gridStmt->execute([
                $city->cityId,
                $grid->width,
                $grid->height,
                $jsonTiles,
            ]);

            $this->pdo->commit();
        } catch (\Throwable $e) {
            $this->pdo->rollBack();
            throw new RuntimeException("Transaction failed while saving city and grid: " . $e->getMessage(), 0, $e);
        }
    }

    public function resetCity(int $cityId, string $cityName = 'Edo-Tokyo'): void
    {
        $this->pdo->beginTransaction();
        try {
            // 1. Ensure parent city exists
            $check = $this->pdo->prepare("SELECT city_id FROM cities WHERE city_id = ?");
            $check->execute([$cityId]);
            if (!$check->fetch()) {
                // Ensure default user exists
                $userCheck = $this->pdo->query("SELECT id FROM users LIMIT 1");
                $userId = $userCheck->fetchColumn();
                if (!$userId) {
                    $insertUser = $this->pdo->prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)");
                    $insertUser->execute(['mayor', password_hash('meiji1868', PASSWORD_DEFAULT)]);
                    $userId = (int) $this->pdo->lastInsertId();
                }

                $insertCity = $this->pdo->prepare("
                    INSERT INTO cities (city_id, user_id, city_name, treasury, population, current_year, current_month)
                    VALUES (?, ?, ?, 5000, 0, 1872, 1)
                ");
                $insertCity->execute([$cityId, (int) $userId, $cityName]);
            } else {
                // Reset City basic attributes and name
                $cityStmt = $this->pdo->prepare("
                    UPDATE cities 
                    SET city_name = ?, treasury = 5000, population = 0, current_year = 1872, current_month = 1, last_saved = CURRENT_TIMESTAMP
                    WHERE city_id = ?
                ");
                $cityStmt->execute([$cityName, $cityId]);
            }

            // 2. Clear Grid Tiles to empty array
            $gridStmt = $this->pdo->prepare("
                INSERT INTO city_grids (city_id, grid_width, grid_height, tile_data)
                VALUES (?, 32, 32, '[]')
                ON DUPLICATE KEY UPDATE
                    grid_width = 32,
                    grid_height = 32,
                    tile_data = '[]'
            ");
            $gridStmt->execute([$cityId]);

            // 3. Reset City Metrics
            $metricsStmt = $this->pdo->prepare("
                INSERT INTO city_metrics (city_id, tradition_modernity_balance, fire_risk, cholera_risk, industrial_demand, commercial_demand, residential_demand)
                VALUES (?, 50, 20, 10, 30, 40, 60)
                ON DUPLICATE KEY UPDATE
                    tradition_modernity_balance = 50,
                    fire_risk = 20,
                    cholera_risk = 10,
                    industrial_demand = 30,
                    commercial_demand = 40,
                    residential_demand = 60
            ");
            $metricsStmt->execute([$cityId]);

            $this->pdo->commit();
        } catch (\Throwable $e) {
            $this->pdo->rollBack();
            throw new RuntimeException("Transaction failed while resetting city: " . $e->getMessage(), 0, $e);
        }
    }

    private function seedInitialCity(int $cityId): City
    {
        $this->resetCity($cityId);
        $seeded = $this->getCity($cityId);
        if ($seeded === null) {
            throw new RuntimeException("Failed to seed initial city ID {$cityId}");
        }
        return $seeded;
    }
}
