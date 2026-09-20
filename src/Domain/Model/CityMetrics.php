<?php
declare(strict_types=1);

namespace Meiji\Domain\Model;

final class CityMetrics
{
    public function __construct(
        public readonly int $cityId,
        public int $traditionModernityBalance = 50,
        public int $fireRisk = 20,
        public int $choleraRisk = 10,
        public int $industrialDemand = 30,
        public int $commercialDemand = 40,
        public int $residentialDemand = 60
    ) {}

    public function toArray(): array
    {
        return [
            'cityId' => $this->cityId,
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
        return new self(
            cityId: $cityId,
            traditionModernityBalance: (int) ($data['tradition_modernity_balance'] ?? $data['traditionModernityBalance'] ?? 50),
            fireRisk: (int) ($data['fire_risk'] ?? $data['fireRisk'] ?? 20),
            choleraRisk: (int) ($data['cholera_risk'] ?? $data['choleraRisk'] ?? 10),
            industrialDemand: (int) ($data['industrial_demand'] ?? $data['industrialDemand'] ?? 30),
            commercialDemand: (int) ($data['commercial_demand'] ?? $data['commercialDemand'] ?? 40),
            residentialDemand: (int) ($data['residential_demand'] ?? $data['residentialDemand'] ?? 60)
        );
    }
}
