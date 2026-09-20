<?php
declare(strict_types=1);

namespace Meiji\Domain\Model;

final class User
{
    public function __construct(
        public readonly int $id,
        public readonly string $username,
        public readonly string $passwordHash,
        public readonly string $createdAt = ''
    ) {}

    public function toArray(bool $includeHash = false): array
    {
        $data = [
            'id' => $this->id,
            'username' => $this->username,
            'createdAt' => $this->createdAt,
        ];
        if ($includeHash) {
            $data['passwordHash'] = $this->passwordHash;
        }
        return $data;
    }
}