<?php
declare(strict_types=1);

namespace Meiji\Domain\Model;

use InvalidArgumentException;

// ponytail: grid as coordinate map "x_y" => Tile, sparse storage for non-empty tiles
final class CityGrid
{
    /** @var array<string, Tile> */
    private array $tiles = [];

    public function __construct(
        public readonly int $cityId,
        public readonly int $width = 32,
        public readonly int $height = 32
    ) {
        if ($this->width < 8 || $this->height < 8) {
            throw new InvalidArgumentException("Grid dimensions must be at least 8x8");
        }
    }

    public function getTile(int $x, int $y): ?Tile
    {
        return $this->tiles["{$x}_{$y}"] ?? null;
    }

    public function setTile(Tile $tile): void
    {
        if ($tile->x >= $this->width || $tile->y >= $this->height) {
            throw new InvalidArgumentException("Tile coordinates ({$tile->x}, {$tile->y}) out of bounds ({$this->width}x{$this->height})");
        }

        if ($tile->type === Tile::TYPE_EMPTY) {
            unset($this->tiles["{$tile->x}_{$tile->y}"]);
        } else {
            $this->tiles["{$tile->x}_{$tile->y}"] = $tile;
        }
    }

    /**
     * @return array<string, array>
     */
    public function toArray(): array
    {
        $out = [];
        foreach ($this->tiles as $key => $tile) {
            $out[$key] = $tile->toArray();
        }
        return $out;
    }

    public static function fromArray(int $cityId, int $width, int $height, array $data): self
    {
        $grid = new self($cityId, $width, $height);
        foreach ($data as $tileData) {
            if (is_array($tileData)) {
                $tile = Tile::fromArray($tileData);
                $grid->setTile($tile);
            }
        }
        return $grid;
    }
}
