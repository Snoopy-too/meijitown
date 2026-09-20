<?php
declare(strict_types=1);

namespace Meiji\Infrastructure\Container;

use Closure;
use ReflectionClass;
use ReflectionNamedType;
use RuntimeException;

// ponytail: minimal DI container with reflection autowiring, zero external libraries
final class Container
{
    /** @var array<string, mixed> */
    private array $instances = [];

    /** @var array<string, Closure> */
    private array $bindings = [];

    public function set(string $id, mixed $instance): void
    {
        $this->instances[$id] = $instance;
    }

    public function bind(string $id, Closure $factory): void
    {
        $this->bindings[$id] = $factory;
    }

    public function get(string $id): mixed
    {
        if (isset($this->instances[$id])) {
            return $this->instances[$id];
        }

        if (isset($this->bindings[$id])) {
            $instance = ($this->bindings[$id])($this);
            $this->instances[$id] = $instance;
            return $instance;
        }

        return $this->resolve($id);
    }

    public function has(string $id): bool
    {
        return isset($this->instances[$id]) || isset($this->bindings[$id]) || class_exists($id);
    }

    private function resolve(string $className): object
    {
        if (!class_exists($className)) {
            throw new RuntimeException("Target class [{$className}] does not exist.");
        }

        $reflector = new ReflectionClass($className);
        if (!$reflector->isInstantiable()) {
            throw new RuntimeException("Target class [{$className}] is not instantiable.");
        }

        $constructor = $reflector->getConstructor();
        if ($constructor === null) {
            $instance = new $className();
            $this->instances[$className] = $instance;
            return $instance;
        }

        $parameters = $constructor->getParameters();
        $dependencies = [];

        foreach ($parameters as $parameter) {
            $type = $parameter->getType();
            if ($type instanceof ReflectionNamedType && !$type->isBuiltin()) {
                $dependencies[] = $this->get($type->getName());
            } elseif ($parameter->isDefaultValueAvailable()) {
                $dependencies[] = $parameter->getDefaultValue();
            } else {
                throw new RuntimeException("Cannot resolve parameter [{$parameter->getName()}] for class [{$className}].");
            }
        }

        $instance = $reflector->newInstanceArgs($dependencies);
        $this->instances[$className] = $instance;
        return $instance;
    }
}
