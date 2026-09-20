<?php
declare(strict_types=1);

// ponytail: single front controller routing actions, clean JSON responses

require_once __DIR__ . '/../src/bootstrap.php';

use Meiji\Application\UseCase\GetCityStateUseCase;
use Meiji\Application\UseCase\SaveCityGridUseCase;
use Meiji\Application\UseCase\ResetCityUseCase;
use Meiji\Application\UseCase\AuthUserUseCase;
use Meiji\Application\UseCase\ManageSavedCitiesUseCase;

if (session_status() === PHP_SESSION_NONE) {
    session_start([
        'cookie_httponly' => true,
        'cookie_samesite' => 'Lax',
    ]);
}

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    exit(0);
}

try {
    $container = createContainer();
    $action = (string) ($_GET['action'] ?? 'get_city');

    if ($action === 'ping') {
        echo json_encode(['status' => 'ok', 'timestamp' => time()], JSON_THROW_ON_ERROR);
        exit(0);
    }

    if ($action === 'get_city') {
        $cityId = isset($_GET['id']) ? (int) $_GET['id'] : 1;
        if ($cityId <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Invalid city ID'], JSON_THROW_ON_ERROR);
            exit(0);
        }

        /** @var GetCityStateUseCase $useCase */
        $useCase = $container->get(GetCityStateUseCase::class);
        $data = $useCase->execute($cityId);

        echo json_encode(['success' => true, 'data' => $data], JSON_THROW_ON_ERROR);
        exit(0);
    }

    if ($action === 'save_grid') {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['success' => false, 'error' => 'Method Not Allowed. Use POST.'], JSON_THROW_ON_ERROR);
            exit(0);
        }

        $rawBody = file_get_contents('php://input');
        if (empty($rawBody)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Empty request payload.'], JSON_THROW_ON_ERROR);
            exit(0);
        }

        $payload = json_decode($rawBody, true, 512, JSON_THROW_ON_ERROR);
        if (!is_array($payload)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Invalid JSON payload.'], JSON_THROW_ON_ERROR);
            exit(0);
        }

        $cityId = (int) ($payload['cityId'] ?? 1);
        $tilesData = is_array($payload['tiles'] ?? null) ? $payload['tiles'] : [];
        $width = (int) ($payload['width'] ?? 32);
        $height = (int) ($payload['height'] ?? 32);
        $treasury = isset($payload['treasury']) ? (int) $payload['treasury'] : null;
        $population = isset($payload['population']) ? (int) $payload['population'] : null;
        $metrics = is_array($payload['metrics'] ?? null) ? $payload['metrics'] : null;

        /** @var SaveCityGridUseCase $useCase */
        $useCase = $container->get(SaveCityGridUseCase::class);
        $result = $useCase->execute(
            cityId: $cityId,
            tilesData: $tilesData,
            width: $width,
            height: $height,
            treasury: $treasury,
            population: $population,
            metricsData: $metrics
        );

        echo json_encode(['success' => true, 'data' => $result], JSON_THROW_ON_ERROR);
        exit(0);
    }

    if ($action === 'reset_city') {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['success' => false, 'error' => 'Method Not Allowed. Use POST.'], JSON_THROW_ON_ERROR);
            exit(0);
        }

        $cityId = isset($_GET['id']) ? (int) $_GET['id'] : 1;
        if ($cityId <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Invalid city ID'], JSON_THROW_ON_ERROR);
            exit(0);
        }

        $rawBody = (string) file_get_contents('php://input');
        $cityName = 'Edo-Tokyo';
        if (!empty($rawBody)) {
            $parsedBody = json_decode($rawBody, true);
            if (is_array($parsedBody) && !empty($parsedBody['cityName'])) {
                $cityName = (string) $parsedBody['cityName'];
            }
        }

        /** @var ResetCityUseCase $useCase */
        $useCase = $container->get(ResetCityUseCase::class);
        $result = $useCase->execute($cityId, $cityName);

        echo json_encode(['success' => true, 'data' => $result], JSON_THROW_ON_ERROR);
        exit(0);
    }

    // --- Multi-User Authentication Actions ---
    if ($action === 'register') {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['success' => false, 'error' => 'Method Not Allowed. Use POST.'], JSON_THROW_ON_ERROR);
            exit(0);
        }

        $payload = json_decode((string) file_get_contents('php://input'), true, 512, JSON_THROW_ON_ERROR);
        $username = (string) ($payload['username'] ?? '');
        $password = (string) ($payload['password'] ?? '');

        /** @var AuthUserUseCase $authCase */
        $authCase = $container->get(AuthUserUseCase::class);
        $user = $authCase->register($username, $password);

        $_SESSION['user_id'] = $user['id'];
        $_SESSION['username'] = $user['username'];

        echo json_encode(['success' => true, 'data' => ['user' => $user]], JSON_THROW_ON_ERROR);
        exit(0);
    }

    if ($action === 'login') {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['success' => false, 'error' => 'Method Not Allowed. Use POST.'], JSON_THROW_ON_ERROR);
            exit(0);
        }

        $payload = json_decode((string) file_get_contents('php://input'), true, 512, JSON_THROW_ON_ERROR);
        $username = (string) ($payload['username'] ?? '');
        $password = (string) ($payload['password'] ?? '');

        /** @var AuthUserUseCase $authCase */
        $authCase = $container->get(AuthUserUseCase::class);
        $user = $authCase->login($username, $password);

        if ($user === null) {
            http_response_code(401);
            echo json_encode(['success' => false, 'error' => 'Invalid username or password.'], JSON_THROW_ON_ERROR);
            exit(0);
        }

        $_SESSION['user_id'] = $user['id'];
        $_SESSION['username'] = $user['username'];

        echo json_encode(['success' => true, 'data' => ['user' => $user]], JSON_THROW_ON_ERROR);
        exit(0);
    }

    if ($action === 'logout') {
        $_SESSION = [];
        if (ini_get("session.use_cookies")) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000,
                $params["path"], $params["domain"],
                $params["secure"], $params["httponly"]
            );
        }
        session_destroy();

        echo json_encode(['success' => true, 'message' => 'Logged out successfully.'], JSON_THROW_ON_ERROR);
        exit(0);
    }

    if ($action === 'current_user') {
        $userId = isset($_SESSION['user_id']) ? (int) $_SESSION['user_id'] : null;
        if ($userId === null) {
            echo json_encode(['success' => true, 'data' => ['authenticated' => false, 'user' => null]], JSON_THROW_ON_ERROR);
            exit(0);
        }

        /** @var AuthUserUseCase $authCase */
        $authCase = $container->get(AuthUserUseCase::class);
        $user = $authCase->getUser($userId);

        echo json_encode([
            'success' => true,
            'data' => [
                'authenticated' => $user !== null,
                'user' => $user,
            ]
        ], JSON_THROW_ON_ERROR);
        exit(0);
    }

    // --- Multi-User Saved Cities Persistence Actions ---
    if ($action === 'list_saved_cities') {
        $userId = isset($_SESSION['user_id']) ? (int) $_SESSION['user_id'] : null;
        if ($userId === null) {
            http_response_code(401);
            echo json_encode(['success' => false, 'error' => 'Authentication required to list saved settlements.'], JSON_THROW_ON_ERROR);
            exit(0);
        }

        /** @var ManageSavedCitiesUseCase $cityCase */
        $cityCase = $container->get(ManageSavedCitiesUseCase::class);
        $cities = $cityCase->listCities($userId);

        echo json_encode(['success' => true, 'data' => ['cities' => $cities]], JSON_THROW_ON_ERROR);
        exit(0);
    }

    if ($action === 'save_user_city') {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['success' => false, 'error' => 'Method Not Allowed. Use POST.'], JSON_THROW_ON_ERROR);
            exit(0);
        }

        $userId = isset($_SESSION['user_id']) ? (int) $_SESSION['user_id'] : null;
        if ($userId === null) {
            http_response_code(401);
            echo json_encode(['success' => false, 'error' => 'Please login or register to save settlements to your account.'], JSON_THROW_ON_ERROR);
            exit(0);
        }

        $payload = json_decode((string) file_get_contents('php://input'), true, 512, JSON_THROW_ON_ERROR);
        if (!is_array($payload)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Invalid JSON payload.'], JSON_THROW_ON_ERROR);
            exit(0);
        }

        $cityName = (string) ($payload['cityName'] ?? 'Edo-Tokyo Settlement');
        $chronicleYear = (int) ($payload['chronicleYear'] ?? 1872);
        $chronicleMonth = (int) ($payload['chronicleMonth'] ?? 1);
        $population = (int) ($payload['population'] ?? 0);
        $treasury = (int) ($payload['treasury'] ?? 5000);
        $cityId = isset($payload['cityId']) && (int)$payload['cityId'] > 0 ? (int)$payload['cityId'] : null;

        // Ensure cityData is valid JSON string
        $cityDataRaw = $payload['cityData'] ?? null;
        $cityDataStr = is_string($cityDataRaw) ? $cityDataRaw : json_encode($cityDataRaw ?? $payload, JSON_THROW_ON_ERROR);

        /** @var ManageSavedCitiesUseCase $cityCase */
        $cityCase = $container->get(ManageSavedCitiesUseCase::class);
        $savedId = $cityCase->saveCity(
            userId: $userId,
            cityName: $cityName,
            chronicleYear: $chronicleYear,
            chronicleMonth: $chronicleMonth,
            population: $population,
            treasury: $treasury,
            cityData: $cityDataStr,
            cityId: $cityId
        );

        echo json_encode(['success' => true, 'data' => ['savedCityId' => $savedId]], JSON_THROW_ON_ERROR);
        exit(0);
    }

    if ($action === 'load_user_city') {
        $userId = isset($_SESSION['user_id']) ? (int) $_SESSION['user_id'] : null;
        if ($userId === null) {
            http_response_code(401);
            echo json_encode(['success' => false, 'error' => 'Authentication required.'], JSON_THROW_ON_ERROR);
            exit(0);
        }

        $cityId = isset($_GET['city_id']) ? (int) $_GET['city_id'] : 0;
        if ($cityId <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Invalid city ID.'], JSON_THROW_ON_ERROR);
            exit(0);
        }

        /** @var ManageSavedCitiesUseCase $cityCase */
        $cityCase = $container->get(ManageSavedCitiesUseCase::class);
        $city = $cityCase->getCity($cityId, $userId);

        if ($city === null) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'City slot not found or unauthorized.'], JSON_THROW_ON_ERROR);
            exit(0);
        }

        echo json_encode(['success' => true, 'data' => ['city' => $city]], JSON_THROW_ON_ERROR);
        exit(0);
    }

    if ($action === 'delete_user_city') {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['success' => false, 'error' => 'Method Not Allowed. Use POST.'], JSON_THROW_ON_ERROR);
            exit(0);
        }

        $userId = isset($_SESSION['user_id']) ? (int) $_SESSION['user_id'] : null;
        if ($userId === null) {
            http_response_code(401);
            echo json_encode(['success' => false, 'error' => 'Authentication required.'], JSON_THROW_ON_ERROR);
            exit(0);
        }

        $payload = json_decode((string) file_get_contents('php://input'), true, 512, JSON_THROW_ON_ERROR);
        $cityId = (int) ($payload['cityId'] ?? 0);

        /** @var ManageSavedCitiesUseCase $cityCase */
        $cityCase = $container->get(ManageSavedCitiesUseCase::class);
        $deleted = $cityCase->deleteCity($cityId, $userId);

        echo json_encode(['success' => $deleted], JSON_THROW_ON_ERROR);
        exit(0);
    }

    http_response_code(404);
    echo json_encode(['success' => false, 'error' => "Unknown action '{$action}'"], JSON_THROW_ON_ERROR);
    exit(0);
} catch (Throwable $e) {
    http_response_code(500);
    // Sanitize message to prevent XSS/injection leakage
    $safeMessage = htmlspecialchars($e->getMessage(), ENT_QUOTES, 'UTF-8');
    echo json_encode(['success' => false, 'error' => $safeMessage], JSON_THROW_ON_ERROR);
    exit(0);
}
