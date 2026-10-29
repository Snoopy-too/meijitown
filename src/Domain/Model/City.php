<?php
declare(strict_types=1);

namespace Meiji\Domain\Model;

use InvalidArgumentException;

// ponytail: domain entity with PHP 8.5 asymmetric visibility and property hooks
final class City
{
    private string $cityNameVal;
    private int $treasuryVal = 5000;
    private int $populationVal = 0;

    public function __construct(
        public private(set) int $cityId,
        public private(set) int $userId,
        string $cityName,
        int $treasury = 5000,
        int $population = 0,
        public private(set) int $currentYear = 1872,
        public private(set) int $currentMonth = 1,
        public private(set) ?string $lastSaved = null,
        public ?CityMetrics $metrics = null
    ) {
        $this->cityName = $cityName;
        $this->treasury = $treasury;
        $this->population = $population;
    }

    public string $cityName {
        get => $this->cityNameVal;
        set {
            $clean = trim($value);
            if ($clean === '') {
                throw new InvalidArgumentException("City name cannot be empty");
            }
            $this->cityNameVal = $clean;
        }
    }

    // Property hook guarding treasury against negative balance
    public int $treasury {
        get => $this->treasuryVal;
        set {
            if ($value < 0) {
                throw new InvalidArgumentException("Treasury cannot fall below 0. Attempted: {$value}");
            }
            $this->treasuryVal = $value;
        }
    }

    public int $funds {
        get => $this->treasuryVal;
        set => $this->treasury = $value;
    }

    public int $population {
        get => $this->populationVal;
        set {
            if ($value < 0) {
                throw new InvalidArgumentException("Population cannot be negative. Attempted: {$value}");
            }
            $this->populationVal = $value;
        }
    }

    public function toArray(): array
    {
        return [
            'cityId' => $this->cityId,
            'userId' => $this->userId,
            'cityName' => $this->cityName,
            'treasury' => $this->treasury,
            'funds' => $this->funds,
            'population' => $this->population,
            'currentYear' => $this->currentYear,
            'currentMonth' => $this->currentMonth,
            'lastSaved' => $this->lastSaved,
            'metrics' => $this->metrics?->toArray(),
        ];
    }
}
