<?php
declare(strict_types=1);

// ponytail: minimal PSR-4 autoloader, no composer required
spl_autoload_register(function (string $class): void {
    $prefix = 'Meiji\\';
    if (!str_starts_with($class, $prefix)) {
        return;
    }

    $relative = substr($class, strlen($prefix));
    $file = __DIR__ . '/' . str_replace('\\', '/', $relative) . '.php';

    if (file_exists($file)) {
        require_once $file;
    }
});

use Meiji\Application\UseCase\AuthUserUseCase;
use Meiji\Application\UseCase\ManageSavedCitiesUseCase;
use Meiji\Domain\Repository\CityRepositoryInterface;
use Meiji\Domain\Repository\SavedCityRepositoryInterface;
use Meiji\Infrastructure\Container\Container;
use Meiji\Infrastructure\Database\DatabaseConnection;
use Meiji\Infrastructure\Repository\PdoCityRepository;
use Meiji\Infrastructure\Repository\PdoSavedCityRepository;

function createContainer(): Container
{
    $container = new Container();

    // Database Connection Singleton
    $container->bind(DatabaseConnection::class, function () {
        return new DatabaseConnection(
            host: '127.0.0.1',
            port: 3306,
            database: 'meijitown',
            username: 'root',
            password: ''
        );
    });

    // Repository Interface Bindings
    $container->bind(CityRepositoryInterface::class, function (Container $c) {
        /** @var DatabaseConnection $conn */
        $conn = $c->get(DatabaseConnection::class);
        return new PdoCityRepository($conn);
    });

    $container->bind(SavedCityRepositoryInterface::class, function (Container $c) {
        /** @var DatabaseConnection $conn */
        $conn = $c->get(DatabaseConnection::class);
        return new PdoSavedCityRepository($conn);
    });

    // Use Case Bindings
    $container->bind(AuthUserUseCase::class, function (Container $c) {
        /** @var SavedCityRepositoryInterface $repo */
        $repo = $c->get(SavedCityRepositoryInterface::class);
        return new AuthUserUseCase($repo);
    });

    $container->bind(ManageSavedCitiesUseCase::class, function (Container $c) {
        /** @var SavedCityRepositoryInterface $repo */
        $repo = $c->get(SavedCityRepositoryInterface::class);
        return new ManageSavedCitiesUseCase($repo);
    });

    return $container;
}
