<?php
declare(strict_types=1);

namespace Meiji\Domain\Model;

final class SavedCity
{
    public function __construct(
        public readonly int $id,
        public readonly int $userId,
        public readonly string $cityName,
        public readonly int $chronicleYear,
        public readonly int $chronicleMonth,
        public readonly int $population,
        public readonly int $treasury,
        public readonly string $cityData,
        public readonly string $updatedAt = ''
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