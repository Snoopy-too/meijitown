<?php
declare(strict_types=1);

namespace Meiji\Domain\Repository;

use Meiji\Domain\Model\City;
use Meiji\Domain\Model\CityGrid;

interface CityRepositoryInterface
{
    public function getCity(int $cityId): ?City;

    public function getGrid(int $cityId): ?CityGrid;

    public function saveCityAndGrid(City $city, CityGrid $grid): void;

    public function resetCity(int $cityId): void;
}
