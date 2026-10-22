<?php
declare(strict_types=1);

namespace Meiji\Application\UseCase;

use InvalidArgumentException;
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
        ?array $metricsData = null,
        ?string $cityName = null
    ): array {
        if ($cityId <= 0) {
            throw new InvalidArgumentException("Invalid city ID: {$cityId}");
        }

        if ($width < 8 || $width > 128 || $height < 8 || $height > 128) {
            throw new InvalidArgumentException("Grid dimensions out of bounds: {$width}x{$height}");
        }

        $city = $this->cityRepository->getCity($cityId);
        if ($city === null) {
            throw new RuntimeException("City with ID {$cityId} not found");
        }

        if ($cityName !== null) {
            $cleanCityName = htmlspecialchars(strip_tags(trim($cityName)), ENT_QUOTES, 'UTF-8');
            if ($cleanCityName !== '') {
                $city->cityName = mb_substr($cleanCityName, 0, 100);
            }
        }

        if ($treasury !== null) {
            if ($treasury < 0 || $treasury > 1_000_000_000) {
                throw new InvalidArgumentException("Treasury must be non-negative and <= 1,000,000,000. Got: {$treasury}");
            }
            $city->treasury = $treasury;
        }

        if ($population !== null) {
            if ($population < 0 || $population > 10_000_000) {
                throw new InvalidArgumentException("Population must be non-negative and <= 10,000,000. Got: {$population}");
            }
            $city->population = $population;
        }

        if ($metricsData !== null && $city->metrics !== null) {
            if (isset($metricsData['traditionModernityBalance'])) {
                $city->metrics->traditionModernityBalance = max(0, min(100, (int) $metricsData['traditionModernityBalance']));
            }
            if (isset($metricsData['fireRisk'])) {
                $city->metrics->fireRisk = max(0, min(100, (int) $metricsData['fireRisk']));
            }
            if (isset($metricsData['choleraRisk'])) {
                $city->metrics->choleraRisk = max(0, min(100, (int) $metricsData['choleraRisk']));
            }
            if (isset($metricsData['industrialDemand'])) {
                $city->metrics->industrialDemand = max(0, min(100, (int) $metricsData['industrialDemand']));
            }
            if (isset($metricsData['commercialDemand'])) {
                $city->metrics->commercialDemand = max(0, min(100, (int) $metricsData['commercialDemand']));
            }
            if (isset($metricsData['residentialDemand'])) {
                $city->metrics->residentialDemand = max(0, min(100, (int) $metricsData['residentialDemand']));
            }
        }

        $grid = new CityGrid($cityId, $width, $height);
        foreach ($tilesData as $tileItem) {
            if (!is_array($tileItem)) {
                continue;
            }
            $tx = (int) ($tileItem['x'] ?? 0);
            $ty = isset($tileItem['y']) ? (int) $tileItem['y'] : (isset($tileItem['z']) ? (int) $tileItem['z'] : 0);
            if ($tx < 0 || $tx >= $width || $ty < 0 || $ty >= $height) {
                throw new InvalidArgumentException("Tile coordinate ({$tx}, {$ty}) out of bounds ({$width}x{$height})");
            }
            $tile = Tile::fromArray($tileItem);
            $grid->setTile($tile);
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
