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
    private string $configFilePath;

    public function __construct(DatabaseConnection $connection, ?string $configFilePath = null)
    {
        $this->pdo = $connection->getPdo();
        $this->configFilePath = $configFilePath ?? dirname(__DIR__, 3) . '/data/city_config.json';
    }

    public function getCity(int $cityId): ?City
    {
        $stmt = $this->pdo->prepare("SELECT * FROM cities WHERE city_id = ?");
        $stmt->execute([$cityId]);
        $row = $stmt->fetch();

        if (!$row) {
            if ($cityId === 1) {
                return $this->seedInitialCity(1);
            }
            return null;
        }

        $metricsData = $this->loadMetricsFromConfig($cityId);
        $metrics = $metricsData !== null ? CityMetrics::fromArray($cityId, $metricsData) : null;

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
        $gridConfig = $this->loadGridFromConfig($cityId);
        if ($gridConfig === null) {
            return null;
        }

        $width = (int) ($gridConfig['grid_width'] ?? 32);
        $height = (int) ($gridConfig['grid_height'] ?? 32);
        $tileData = is_array($gridConfig['tiles'] ?? null) ? $gridConfig['tiles'] : [];

        return CityGrid::fromArray(
            cityId: $cityId,
            width: $width,
            height: $height,
            data: $tileData
        );
    }

    public function saveCityAndGrid(City $city, CityGrid $grid): void
    {
        $this->pdo->beginTransaction();
        try {
            // 1. Update City basic attributes in DB
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

            // 2. Save Grid & Metrics into single config file
            $metricsArr = null;
            if ($city->metrics !== null) {
                $metricsArr = [
                    'tradition_modernity_balance' => $city->metrics->traditionModernityBalance,
                    'fire_risk' => $city->metrics->fireRisk,
                    'cholera_risk' => $city->metrics->choleraRisk,
                    'industrial_demand' => $city->metrics->industrialDemand,
                    'commercial_demand' => $city->metrics->commercialDemand,
                    'residential_demand' => $city->metrics->residentialDemand,
                    'traditionModernityBalance' => $city->metrics->traditionModernityBalance,
                    'fireRisk' => $city->metrics->fireRisk,
                    'choleraRisk' => $city->metrics->choleraRisk,
                    'industrialDemand' => $city->metrics->industrialDemand,
                    'commercialDemand' => $city->metrics->commercialDemand,
                    'residentialDemand' => $city->metrics->residentialDemand,
                ];
            }
            $tilesArr = $grid->toArray();

            $this->updateConfigForCity($city->cityId, [
                'grid_width' => $grid->width,
                'grid_height' => $grid->height,
                'tiles' => $tilesArr,
                'metrics' => $metricsArr,
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
            // 1. Ensure parent city exists in DB
            $check = $this->pdo->prepare("SELECT city_id FROM cities WHERE city_id = ?");
            $check->execute([$cityId]);
            if (!$check->fetch()) {
                // Ensure default user exists
                $userCheck = $this->pdo->query("SELECT id FROM users LIMIT 1");
                $userId = $userCheck ? $userCheck->fetchColumn() : null;
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

            // 2. Reset Grid & Metrics in config file
            $defaultConfig = $this->getDefaultConfig();
            $this->updateConfigForCity($cityId, [
                'grid_width' => (int) ($defaultConfig['grid_width'] ?? 32),
                'grid_height' => (int) ($defaultConfig['grid_height'] ?? 32),
                'tiles' => is_array($defaultConfig['tiles'] ?? null) ? $defaultConfig['tiles'] : [],
                'metrics' => is_array($defaultConfig['metrics'] ?? null) ? $defaultConfig['metrics'] : [
                    'tradition_modernity_balance' => 50,
                    'fire_risk' => 20,
                    'cholera_risk' => 10,
                    'industrial_demand' => 30,
                    'commercial_demand' => 40,
                    'residential_demand' => 60,
                ],
            ]);

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

    /**
     * @return array<string, mixed>
     */
    private function readConfigFile(): array
    {
        if (!file_exists($this->configFilePath)) {
            $dir = dirname($this->configFilePath);
            if (!is_dir($dir)) {
                mkdir($dir, 0755, true);
            }
            $initial = [
                'defaults' => $this->getDefaultConfig(),
                'cities' => [],
            ];
            file_put_contents($this->configFilePath, json_encode($initial, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
            return $initial;
        }

        $raw = (string) file_get_contents($this->configFilePath);
        $data = json_decode($raw, true);
        return is_array($data) ? $data : [];
    }

    /**
     * @param array<string, mixed> $data
     */
    private function writeConfigFile(array $data): void
    {
        $dir = dirname($this->configFilePath);
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
        file_put_contents($this->configFilePath, $json, LOCK_EX);
    }

    /**
     * @return array<string, mixed>
     */
    private function getDefaultConfig(): array
    {
        return [
            'grid_width' => 32,
            'grid_height' => 32,
            'tiles' => [],
            'metrics' => [
                'tradition_modernity_balance' => 50,
                'fire_risk' => 20,
                'cholera_risk' => 10,
                'industrial_demand' => 30,
                'commercial_demand' => 40,
                'residential_demand' => 60,
            ],
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    private function loadGridFromConfig(int $cityId): ?array
    {
        $config = $this->readConfigFile();
        $cityKey = (string) $cityId;

        if (isset($config['cities'][$cityKey]['tiles'])) {
            return [
                'grid_width' => $config['cities'][$cityKey]['grid_width'] ?? 32,
                'grid_height' => $config['cities'][$cityKey]['grid_height'] ?? 32,
                'tiles' => $config['cities'][$cityKey]['tiles'],
            ];
        }

        $defaults = $config['defaults'] ?? $this->getDefaultConfig();
        return [
            'grid_width' => $defaults['grid_width'] ?? 32,
            'grid_height' => $defaults['grid_height'] ?? 32,
            'tiles' => $defaults['tiles'] ?? [],
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    private function loadMetricsFromConfig(int $cityId): ?array
    {
        $config = $this->readConfigFile();
        $cityKey = (string) $cityId;

        if (isset($config['cities'][$cityKey]['metrics'])) {
            return $config['cities'][$cityKey]['metrics'];
        }

        $defaults = $config['defaults'] ?? $this->getDefaultConfig();
        return $defaults['metrics'] ?? null;
    }

    /**
     * @param array<string, mixed> $cityData
     */
    private function updateConfigForCity(int $cityId, array $cityData): void
    {
        $config = $this->readConfigFile();
        $cityKey = (string) $cityId;

        if (!isset($config['cities']) || !is_array($config['cities'])) {
            $config['cities'] = [];
        }

        if (!isset($config['cities'][$cityKey]) || !is_array($config['cities'][$cityKey])) {
            $config['cities'][$cityKey] = [];
        }

        foreach ($cityData as $key => $val) {
            $config['cities'][$cityKey][$key] = $val;
        }

        $this->writeConfigFile($config);
    }
}
