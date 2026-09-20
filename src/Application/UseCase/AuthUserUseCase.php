<?php
declare(strict_types=1);

namespace Meiji\Application\UseCase;

use InvalidArgumentException;
use Meiji\Domain\Repository\SavedCityRepositoryInterface;

final class AuthUserUseCase
{
    public function __construct(
        private readonly SavedCityRepositoryInterface $repository
    ) {}

    public function register(string $username, string $password): array
    {
        $cleanUsername = trim($username);
        if (strlen($cleanUsername) < 3 || strlen($cleanUsername) > 50) {
            throw new InvalidArgumentException('Username must be between 3 and 50 characters.');
        }

        if (!preg_match('/^[a-zA-Z0-9_-]+$/', $cleanUsername)) {
            throw new InvalidArgumentException('Username may only contain letters, numbers, hyphens, and underscores.');
        }

        if (strlen($password) < 6) {
            throw new InvalidArgumentException('Password must be at least 6 characters long.');
        }

        $existing = $this->repository->findUserByUsername($cleanUsername);
        if ($existing !== null) {
            throw new InvalidArgumentException('Username already taken. Please choose another.');
        }

        $hash = password_hash($password, PASSWORD_DEFAULT);
        $user = $this->repository->createUser($cleanUsername, $hash);

        return [
            'id' => $user->id,
            'username' => $user->username,
        ];
    }

    public function login(string $username, string $password): ?array
    {
        $cleanUsername = trim($username);
        if (empty($cleanUsername) || empty($password)) {
            return null;
        }

        $user = $this->repository->findUserByUsername($cleanUsername);
        if ($user === null) {
            return null;
        }

        if (!password_verify($password, $user->passwordHash)) {
            return null;
        }

        return [
            'id' => $user->id,
            'username' => $user->username,
        ];
    }

    public function getUser(int $userId): ?array
    {
        $user = $this->repository->findUserById($userId);
        if ($user === null) {
            return null;
        }

        return [
            'id' => $user->id,
            'username' => $user->username,
        ];
    }
}