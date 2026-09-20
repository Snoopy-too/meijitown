<?php
declare(strict_types=1);

namespace Meiji\Application\UseCase;

use Meiji\Domain\Repository\CityRepositoryInterface;

final class ResetCityUseCase
{
    public function __construct(
        private readonly CityRepositoryInterface $cityRepository
    ) {}

    public function execute(int $cityId, string $cityName = 'Edo-Tokyo'): array
    {
        $cleanCityName = trim(strip_tags($cityName));
        if ($cleanCityName === '') {
            $cleanCityName = 'Edo-Tokyo';
        }
        if (mb_strlen($cleanCityName) > 50) {
            $cleanCityName = mb_substr($cleanCityName, 0, 50);
        }

        $this->cityRepository->resetCity($cityId, $cleanCityName);

        return [
            'cityId' => $cityId,
            'cityName' => $cleanCityName,
            'treasury' => 5000,
            'population' => 0,
            'currentYear' => 1872,
            'currentMonth' => 1,
            'tilesCount' => 0,
        ];
    }
}
