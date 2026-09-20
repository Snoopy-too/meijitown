<?php
declare(strict_types=1);

namespace Meiji\Infrastructure\Repository;

use Meiji\Domain\Model\SavedCity;
use Meiji\Domain\Model\User;
use Meiji\Domain\Repository\SavedCityRepositoryInterface;
use Meiji\Infrastructure\Database\DatabaseConnection;
use PDO;
use RuntimeException;

final class PdoSavedCityRepository implements SavedCityRepositoryInterface
{
    private PDO $pdo;
    private ?string $userIdCol = null;

    public function __construct(DatabaseConnection $connection)
    {
        $this->pdo = $connection->getPdo();
        $this->ensureTables();
    }

    private function ensureTables(): void
    {
        $this->pdo->exec("
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
    }

    private function getUserIdCol(): string
    {
        if ($this->userIdCol === null) {
            $cols = $this->pdo->query("SHOW COLUMNS FROM users")->fetchAll(PDO::FETCH_COLUMN);
            $this->userIdCol = (in_array('user_id', $cols, true) && !in_array('id', $cols, true)) ? 'user_id' : 'id';
        }
        return $this->userIdCol;
    }

    public function findUserByUsername(string $username): ?User
    {
        $idCol = $this->getUserIdCol();
        $stmt = $this->pdo->prepare("SELECT {$idCol} AS id, username, password_hash, created_at FROM users WHERE username = ? LIMIT 1");
        $stmt->execute([$username]);
        $row = $stmt->fetch();
        if (!$row) {
            return null;
        }

        return new User(
            id: (int) $row['id'],
            username: (string) $row['username'],
            passwordHash: (string) $row['password_hash'],
            createdAt: (string) ($row['created_at'] ?? '')
        );
    }

    public function findUserById(int $userId): ?User
    {
        $idCol = $this->getUserIdCol();
        $stmt = $this->pdo->prepare("SELECT {$idCol} AS id, username, password_hash, created_at FROM users WHERE {$idCol} = ? LIMIT 1");
        $stmt->execute([$userId]);
        $row = $stmt->fetch();
        if (!$row) {
            return null;
        }

        return new User(
            id: (int) $row['id'],
            username: (string) $row['username'],
            passwordHash: (string) $row['password_hash'],
            createdAt: (string) ($row['created_at'] ?? '')
        );
    }

    public function createUser(string $username, string $passwordHash): User
    {
        $stmt = $this->pdo->prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)");
        $stmt->execute([$username, $passwordHash]);
        $newId = (int) $this->pdo->lastInsertId();

        return new User(
            id: $newId,
            username: $username,
            passwordHash: $passwordHash,
            createdAt: date('Y-m-d H:i:s')
        );
    }

    /**
     * @return SavedCity[]
     */
    public function listCitiesByUser(int $userId): array
    {
        return $this->listCitiesForUser($userId);
    }

    /**
     * @return SavedCity[]
     */
    public function listCitiesForUser(int $userId): array
    {
        $stmt = $this->pdo->prepare("
            SELECT id, user_id, city_name, chronicle_year, chronicle_month, population, treasury, city_data, updated_at
            FROM saved_cities
            WHERE user_id = ?
            ORDER BY updated_at DESC
        ");
        $stmt->execute([$userId]);
        $rows = $stmt->fetchAll();

        $results = [];
        foreach ($rows as $row) {
            $results[] = new SavedCity(
                id: (int) $row['id'],
                userId: (int) $row['user_id'],
                cityName: (string) $row['city_name'],
                chronicleYear: (int) $row['chronicle_year'],
                chronicleMonth: (int) $row['chronicle_month'],
                population: (int) $row['population'],
                treasury: (int) $row['treasury'],
                cityData: (string) $row['city_data'],
                updatedAt: (string) ($row['updated_at'] ?? '')
            );
        }

        return $results;
    }

    public function getSavedCity(int $cityId, int $userId): ?SavedCity
    {
        return $this->getCityById($cityId, $userId);
    }

    public function getCityById(int $cityId, int $userId): ?SavedCity
    {
        $stmt = $this->pdo->prepare("
            SELECT id, user_id, city_name, chronicle_year, chronicle_month, population, treasury, city_data, updated_at
            FROM saved_cities
            WHERE id = ? AND user_id = ?
            LIMIT 1
        ");
        $stmt->execute([$cityId, $userId]);
        $row = $stmt->fetch();
        if (!$row) {
            return null;
        }

        return new SavedCity(
            id: (int) $row['id'],
            userId: (int) $row['user_id'],
            cityName: (string) $row['city_name'],
            chronicleYear: (int) $row['chronicle_year'],
            chronicleMonth: (int) $row['chronicle_month'],
            population: (int) $row['population'],
            treasury: (int) $row['treasury'],
            cityData: (string) $row['city_data'],
            updatedAt: (string) ($row['updated_at'] ?? '')
        );
    }

    public function saveCityForUser(
        int $userId,
        string $cityName,
        int $chronicleYear,
        int $chronicleMonth,
        int $population,
        int $treasury,
        string $cityData,
        ?int $cityId = null
    ): int {
        if ($cityId !== null && $cityId > 0) {
            // Update existing slot if owned by user
            $stmt = $this->pdo->prepare("
                UPDATE saved_cities
                SET city_name = ?, chronicle_year = ?, chronicle_month = ?, population = ?, treasury = ?, city_data = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND user_id = ?
            ");
            $stmt->execute([
                $cityName,
                $chronicleYear,
                $chronicleMonth,
                $population,
                $treasury,
                $cityData,
                $cityId,
                $userId
            ]);

            if ($stmt->rowCount() > 0) {
                return $cityId;
            }
        }

        // Insert new slot
        $stmt = $this->pdo->prepare("
            INSERT INTO saved_cities (user_id, city_name, chronicle_year, chronicle_month, population, treasury, city_data)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $userId,
            $cityName,
            $chronicleYear,
            $chronicleMonth,
            $population,
            $treasury,
            $cityData
        ]);

        return (int) $this->pdo->lastInsertId();
    }

    public function deleteSavedCity(int $cityId, int $userId): bool
    {
        $stmt = $this->pdo->prepare("DELETE FROM saved_cities WHERE id = ? AND user_id = ?");
        $stmt->execute([$cityId, $userId]);
        return $stmt->rowCount() > 0;
    }
}