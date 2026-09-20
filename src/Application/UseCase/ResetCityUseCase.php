<?php
declare(strict_types=1);

namespace Meiji\Application\UseCase;

use Meiji\Domain\Repository\CityRepositoryInterface;

final class ResetCityUseCase
{
    public function __construct(
        private readonly CityRepositoryInterface $cityRepository
    ) {}

    public function execute(int $cityId): array
    {
        $this->cityRepository->resetCity($cityId);

        return [
            'cityId' => $cityId,
            'treasury' => 5000,
            'population' => 0,
            'currentYear' => 1872,
            'currentMonth' => 1,
            'tilesCount' => 0,
        ];
    }
}
