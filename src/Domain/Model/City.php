<?php
declare(strict_types=1);

namespace Meiji\Domain\Model;

final class City
{
    public function __construct(
        public readonly int $cityId,
        public readonly int $userId,
        public string $cityName,
        public int $treasury = 5000,
        public int $population = 0,
        public int $currentYear = 1872,
        public int $currentMonth = 1,
        public ?string $lastSaved = null,
        public ?CityMetrics $metrics = null
    ) {}

    public function toArray(): array
    {
        return [
            'cityId' => $this->cityId,
            'userId' => $this->userId,
            'cityName' => $this->cityName,
            'treasury' => $this->treasury,
            'population' => $this->population,
            'currentYear' => $this->currentYear,
            'currentMonth' => $this->currentMonth,
            'lastSaved' => $this->lastSaved,
            'metrics' => $this->metrics?->toArray(),
        ];
    }
}
