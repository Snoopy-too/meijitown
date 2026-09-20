<?php
declare(strict_types=1);

namespace Meiji\Application\UseCase;

use Meiji\Domain\Model\CityGrid;
use Meiji\Domain\Model\CityMetrics;
use Meiji\Domain\Model\Tile;
use Meiji\Domain\Repository\CityRepositoryInterface;
use RuntimeException;

final class SaveCityGridUseCase
{
    public function __construct(
        private readonly CityRepositoryInterface $cityRepository
    ) {}

    public function execute(
        int $cityId,
        array $tilesData,
        int $width = 32,
        int $height = 32,
        ?int $treasury = null,
        ?int $population = null,
        ?array $metricsData = null
    ): array {
        $city = $this->cityRepository->getCity($cityId);
        if ($city === null) {
            throw new RuntimeException("City with ID {$cityId} not found");
        }

        if ($treasury !== null) {
            $city->treasury = $treasury;
        }
        if ($population !== null) {
            $city->population = $population;
        }
        if ($metricsData !== null && $city->metrics !== null) {
            if (isset($metricsData['traditionModernityBalance'])) {
                $city->metrics->traditionModernityBalance = (int) $metricsData['traditionModernityBalance'];
            }
            if (isset($metricsData['fireRisk'])) {
                $city->metrics->fireRisk = (int) $metricsData['fireRisk'];
            }
            if (isset($metricsData['choleraRisk'])) {
                $city->metrics->choleraRisk = (int) $metricsData['choleraRisk'];
            }
            if (isset($metricsData['industrialDemand'])) {
                $city->metrics->industrialDemand = (int) $metricsData['industrialDemand'];
            }
            if (isset($metricsData['commercialDemand'])) {
                $city->metrics->commercialDemand = (int) $metricsData['commercialDemand'];
            }
            if (isset($metricsData['residentialDemand'])) {
                $city->metrics->residentialDemand = (int) $metricsData['residentialDemand'];
            }
        }

        $grid = new CityGrid($cityId, $width, $height);
        foreach ($tilesData as $tileItem) {
            if (is_array($tileItem)) {
                $tile = Tile::fromArray($tileItem);
                $grid->setTile($tile);
            }
        }

        $this->cityRepository->saveCityAndGrid($city, $grid);

        return [
            'success' => true,
            'message' => 'City and grid saved successfully',
            'city' => $city->toArray(),
            'tilesCount' => count($grid->toArray()),
        ];
    }
}
