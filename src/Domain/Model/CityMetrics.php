<?php
declare(strict_types=1);

namespace Meiji\Domain\Model;

use InvalidArgumentException;

// ponytail: compact domain metrics entity with PHP 8.5 asymmetric visibility and property hooks
final class CityMetrics
{
    private int $treasury = 5000;
    private int $traditionModernityBalanceVal = 50;
    private int $fireRiskVal = 20;
    private int $choleraRiskVal = 10;
    private int $industrialDemandVal = 30;
    private int $commercialDemandVal = 40;
    private int $residentialDemandVal = 60;
    private int $sanitationLevelVal = 100;

    public function __construct(
        public private(set) int $cityId = 1,
        public private(set) int $population = 0,
        int $treasury = 5000,
        int $sanitationLevel = 100,
        int $traditionModernityBalance = 50,
        int $fireRisk = 20,
        int $choleraRisk = 10,
        int $industrialDemand = 30,
        int $commercialDemand = 40,
        int $residentialDemand = 60
    ) {
        $this->funds = $treasury;
        $this->sanitationLevel = $sanitationLevel;
        $this->traditionModernityBalance = $traditionModernityBalance;
        $this->fireRisk = $fireRisk;
        $this->choleraRisk = $choleraRisk;
        $this->industrialDemand = $industrialDemand;
        $this->commercialDemand = $commercialDemand;
        $this->residentialDemand = $residentialDemand;
    }

    // Property hook guarding treasury against negative balance
    public int $funds {
        get => $this->treasury;
        set {
            if ($value < 0) {
                throw new InvalidArgumentException("Treasury cannot fall below 0. Attempted: {$value}");
            }
            $this->treasury = $value;
        }
    }

    public int $sanitationLevel {
        get => $this->sanitationLevelVal;
        set {
            if ($value < 0 || $value > 100) {
                throw new InvalidArgumentException("Sanitation level must be between 0 and 100. Attempted: {$value}");
            }
            $this->sanitationLevelVal = $value;
        }
    }

    public int $traditionModernityBalance {
        get => $this->traditionModernityBalanceVal;
        set {
            if ($value < 0 || $value > 100) {
                throw new InvalidArgumentException("Tradition/Modernity balance must be between 0 and 100. Attempted: {$value}");
            }
            $this->traditionModernityBalanceVal = $value;
        }
    }

    public int $fireRisk {
        get => $this->fireRiskVal;
        set {
            if ($value < 0 || $value > 100) {
                throw new InvalidArgumentException("Fire risk must be between 0 and 100. Attempted: {$value}");
            }
            $this->fireRiskVal = $value;
        }
    }

    public int $choleraRisk {
        get => $this->choleraRiskVal;
        set {
            if ($value < 0 || $value > 100) {
                throw new InvalidArgumentException("Cholera risk must be between 0 and 100. Attempted: {$value}");
            }
            $this->choleraRiskVal = $value;
        }
    }

    public int $industrialDemand {
        get => $this->industrialDemandVal;
        set {
            if ($value < 0 || $value > 100) {
                throw new InvalidArgumentException("Industrial demand must be between 0 and 100. Attempted: {$value}");
            }
            $this->industrialDemandVal = $value;
        }
    }

    public int $commercialDemand {
        get => $this->commercialDemandVal;
        set {
            if ($value < 0 || $value > 100) {
                throw new InvalidArgumentException("Commercial demand must be between 0 and 100. Attempted: {$value}");
            }
            $this->commercialDemandVal = $value;
        }
    }

    public int $residentialDemand {
        get => $this->residentialDemandVal;
        set {
            if ($value < 0 || $value > 100) {
                throw new InvalidArgumentException("Residential demand must be between 0 and 100. Attempted: {$value}");
            }
            $this->residentialDemandVal = $value;
        }
    }

    public function toArray(): array
    {
        return [
            'cityId' => $this->cityId,
            'population' => $this->population,
            'funds' => $this->funds,
            'sanitationLevel' => $this->sanitationLevel,
            'traditionModernityBalance' => $this->traditionModernityBalance,
            'fireRisk' => $this->fireRisk,
            'choleraRisk' => $this->choleraRisk,
            'industrialDemand' => $this->industrialDemand,
            'commercialDemand' => $this->commercialDemand,
            'residentialDemand' => $this->residentialDemand,
        ];
    }

    public static function fromArray(int $cityId, array $data): self
    {
        $funds = (int) ($data['funds'] ?? $data['treasury'] ?? 5000);
        $population = (int) ($data['population'] ?? 0);
        $cholera = (int) ($data['cholera_risk'] ?? $data['choleraRisk'] ?? 10);
        $sanitation = (int) ($data['sanitationLevel'] ?? $data['sanitation_level'] ?? (100 - $cholera));

        return new self(
            cityId: $cityId,
            population: $population,
            treasury: $funds,
            sanitationLevel: $sanitation,
            traditionModernityBalance: (int) ($data['tradition_modernity_balance'] ?? $data['traditionModernityBalance'] ?? 50),
            fireRisk: (int) ($data['fire_risk'] ?? $data['fireRisk'] ?? 20),
            choleraRisk: $cholera,
            industrialDemand: (int) ($data['industrial_demand'] ?? $data['industrialDemand'] ?? 30),
            commercialDemand: (int) ($data['commercial_demand'] ?? $data['commercialDemand'] ?? 40),
            residentialDemand: (int) ($data['residential_demand'] ?? $data['residentialDemand'] ?? 60)
        );
    }
}
