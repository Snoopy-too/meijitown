<?php
declare(strict_types=1);

namespace Meiji\Application\UseCase;

use InvalidArgumentException;
use Meiji\Domain\Repository\SavedCityRepositoryInterface;

final class ManageSavedCitiesUseCase
{
    public function __construct(
        private readonly SavedCityRepositoryInterface $repository
    ) {}

    public function listCities(int $userId): array
    {
        if ($userId <= 0) {
            throw new InvalidArgumentException('Invalid user ID');
        }

        $cities = $this->repository->listCitiesByUser($userId);
        return array_map(fn($c) => $c->toArray(false), $cities);
    }

    public function getCity(int $cityId, int $userId): ?array
    {
        if ($cityId <= 0 || $userId <= 0) {
            throw new InvalidArgumentException('Invalid city or user ID');
        }

        $city = $this->repository->getSavedCity($cityId, $userId);
        if ($city === null) {
            return null;
        }

        return $city->toArray(true);
    }

    public function saveCity(
        int $userId,
        string $cityName,
        int $chronicleYear,
        int $chronicleMonth,
        int $population,
        int $treasury,
        string $cityData,
        ?int $cityId = null
    ): int {
        if ($userId <= 0) {
            throw new InvalidArgumentException('User must be authenticated to save city slot');
        }

        $cleanName = trim($cityName);
        if (empty($cleanName)) {
            $cleanName = 'Edo-Tokyo Settlement';
        }
        if (strlen($cleanName) > 100) {
            $cleanName = substr($cleanName, 0, 100);
        }

        return $this->repository->saveCityForUser(
            userId: $userId,
            cityName: $cleanName,
            chronicleYear: $chronicleYear,
            chronicleMonth: $chronicleMonth,
            population: $population,
            treasury: $treasury,
            cityData: $cityData,
            cityId: $cityId
        );
    }

    public function deleteCity(int $cityId, int $userId): bool
    {
        if ($cityId <= 0 || $userId <= 0) {
            return false;
        }

        return $this->repository->deleteSavedCity($cityId, $userId);
    }
}