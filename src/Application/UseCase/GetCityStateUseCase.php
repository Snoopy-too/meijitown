<?php
declare(strict_types=1);

namespace Meiji\Application\UseCase;

use Meiji\Domain\Repository\CityRepositoryInterface;
use RuntimeException;

final class GetCityStateUseCase
{
    public function __construct(
        private readonly CityRepositoryInterface $cityRepository
    ) {}

    public function execute(int $cityId): array
    {
        $city = $this->cityRepository->getCity($cityId);
        if ($city === null) {
            throw new RuntimeException("City with ID {$cityId} not found");
        }

        $grid = $this->cityRepository->getGrid($cityId);

        return [
            'city' => $city->toArray(),
            'grid' => [
                'cityId' => $cityId,
                'width' => $grid?->width ?? 32,
                'height' => $grid?->height ?? 32,
                'tiles' => $grid?->toArray() ?? [],
            ],
        ];
    }
}
