<?php
declare(strict_types=1);

namespace Meiji\Domain\Model;

// ponytail: domain model with PHP 8.5 asymmetric visibility
final class SavedCity
{
    public function __construct(
        public private(set) int $id,
        public private(set) int $userId,
        public private(set) string $cityName,
        public private(set) int $chronicleYear,
        public private(set) int $chronicleMonth,
        public private(set) int $population,
        public private(set) int $treasury,
        public private(set) string $cityData,
        public private(set) string $updatedAt = ''
    ) {}

    public function toArray(bool $includeCityData = false): array
    {
        $res = [
            'id' => $this->id,
            'userId' => $this->userId,
            'cityName' => $this->cityName,
            'chronicleYear' => $this->chronicleYear,
            'chronicleMonth' => $this->chronicleMonth,
            'population' => $this->population,
            'treasury' => $this->treasury,
            'updatedAt' => $this->updatedAt,
        ];
        if ($includeCityData) {
            $res['cityData'] = $this->cityData;
        }
        return $res;
    }
}
