<?php
declare(strict_types=1);

namespace Meiji\Domain\Repository;

use Meiji\Domain\Model\SavedCity;
use Meiji\Domain\Model\User;

interface SavedCityRepositoryInterface
{
    public function findUserByUsername(string $username): ?User;
    public function findUserById(int $userId): ?User;
    public function createUser(string $username, string $passwordHash): User;
    
    /**
     * @return SavedCity[]
     */
    public function listCitiesByUser(int $userId): array;
    public function getSavedCity(int $cityId, int $userId): ?SavedCity;
    public function saveCityForUser(
        int $userId,
        string $cityName,
        int $chronicleYear,
        int $chronicleMonth,
        int $population,
        int $treasury,
        string $cityData,
        ?int $cityId = null
    ): int;
    public function deleteSavedCity(int $cityId, int $userId): bool;
}