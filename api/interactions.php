<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('HTTP/1.0 204 No Content');
    exit;
}

require dirname(__FILE__) . '/config.php';

function get_pdo() {
    $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME;
    $options = array(
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    );
    $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
    $pdo->exec("SET NAMES '" . DB_CHARSET . "'");
    return $pdo;
}

function row_to_js($row) {
    return array(
        'id'          => (int) $row['id'],
        'createdAt'   => str_replace(' ', 'T', $row['created_at']) . '.000Z',
        'channelId'   => (int) $row['channel_id'],
        'channelName' => $row['channel_name'],
        'type'        => $row['type'],
        'date'        => $row['date'],
        'contact'     => $row['contact'],
        'note'        => $row['note'],
        'priority'    => $row['priority'],
    );
}

function send_error($code, $message) {
    $statuses = array(
        400 => 'Bad Request',
        404 => 'Not Found',
        405 => 'Method Not Allowed',
        422 => 'Unprocessable Entity',
        500 => 'Internal Server Error',
    );
    $text = isset($statuses[$code]) ? $statuses[$code] : 'Error';
    header('HTTP/1.0 ' . $code . ' ' . $text);
    echo json_encode(array('error' => $message));
    exit;
}

function handle_get($pdo) {
    if (isset($_GET['channel_id'])) {
        $channel_id = (int) $_GET['channel_id'];
        if ($channel_id <= 0) {
            send_error(400, 'Invalid channel_id');
        }
        $stmt = $pdo->prepare(
            'SELECT * FROM channels_interact WHERE channel_id = ? ORDER BY id DESC'
        );
        $stmt->execute(array($channel_id));
    } else {
        $limit = isset($_GET['limit']) ? (int) $_GET['limit'] : 10;
        if ($limit <= 0 || $limit > 200) {
            $limit = 10;
        }
        $stmt = $pdo->prepare(
            'SELECT * FROM channels_interact ORDER BY id DESC LIMIT ?'
        );
        $stmt->bindValue(1, $limit, PDO::PARAM_INT);
        $stmt->execute();
    }

    $rows = $stmt->fetchAll();
    $result = array();
    foreach ($rows as $row) {
        $result[] = row_to_js($row);
    }
    echo json_encode($result);
}

function handle_post($pdo) {
    $body = json_decode(file_get_contents('php://input'), true);
    if ($body === null || !is_array($body)) {
        send_error(400, 'Invalid JSON body');
    }

    $allowed_types     = array('messenger', 'letter', 'call', 'problem', 'other');
    $allowed_priorities = array('low', 'normal', 'high', 'critical');

    $channel_id   = isset($body['channelId'])   ? (int) $body['channelId'] : 0;
    $channel_name = isset($body['channelName']) ? trim($body['channelName']) : '';
    $type         = isset($body['type'])        ? $body['type'] : '';
    $date         = isset($body['date'])        ? $body['date'] : '';
    $contact      = isset($body['contact'])     ? trim($body['contact']) : '';
    $note         = isset($body['note'])        ? trim($body['note']) : '';
    $priority     = isset($body['priority'])    ? $body['priority'] : 'normal';

    if ($channel_id <= 0) {
        send_error(422, 'channelId is required');
    }
    if (!in_array($type, $allowed_types)) {
        send_error(422, 'Invalid type');
    }
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
        send_error(422, 'Invalid date format, expected YYYY-MM-DD');
    }
    if (!in_array($priority, $allowed_priorities)) {
        send_error(422, 'Invalid priority');
    }

    $stmt = $pdo->prepare(
        'INSERT INTO channels_interact (channel_id, channel_name, type, date, contact, note, priority)
         VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute(array($channel_id, $channel_name, $type, $date, $contact, $note, $priority));

    $id = (int) $pdo->lastInsertId();
    $stmt2 = $pdo->prepare('SELECT * FROM channels_interact WHERE id = ?');
    $stmt2->execute(array($id));
    $row = $stmt2->fetch();

    header('HTTP/1.0 201 Created');
    echo json_encode(row_to_js($row));
}

function handle_put($pdo) {
    $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
    if ($id <= 0) {
        send_error(400, 'Missing or invalid id');
    }

    $body = json_decode(file_get_contents('php://input'), true);
    if ($body === null || !is_array($body)) {
        send_error(400, 'Invalid JSON body');
    }

    $allowed_types      = array('messenger', 'letter', 'call', 'problem', 'other');
    $allowed_priorities = array('low', 'normal', 'high', 'critical');

    $type     = isset($body['type'])     ? $body['type'] : null;
    $date     = isset($body['date'])     ? $body['date'] : null;
    $contact  = isset($body['contact'])  ? trim($body['contact']) : null;
    $note     = isset($body['note'])     ? trim($body['note']) : null;
    $priority = isset($body['priority']) ? $body['priority'] : null;

    if ($type !== null && !in_array($type, $allowed_types)) {
        send_error(422, 'Invalid type');
    }
    if ($date !== null && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
        send_error(422, 'Invalid date format, expected YYYY-MM-DD');
    }
    if ($priority !== null && !in_array($priority, $allowed_priorities)) {
        send_error(422, 'Invalid priority');
    }

    $fields = array();
    $params = array();

    if ($type !== null)     { $fields[] = 'type = ?';     $params[] = $type; }
    if ($date !== null)     { $fields[] = 'date = ?';     $params[] = $date; }
    if ($contact !== null)  { $fields[] = 'contact = ?';  $params[] = $contact; }
    if ($note !== null)     { $fields[] = 'note = ?';     $params[] = $note; }
    if ($priority !== null) { $fields[] = 'priority = ?'; $params[] = $priority; }

    if (empty($fields)) {
        send_error(400, 'No fields to update');
    }

    $params[] = $id;
    $stmt = $pdo->prepare(
        'UPDATE channels_interact SET ' . implode(', ', $fields) . ' WHERE id = ?'
    );
    $stmt->execute($params);

    if ($stmt->rowCount() === 0) {
        send_error(404, 'Interaction not found');
    }

    $stmt2 = $pdo->prepare('SELECT * FROM channels_interact WHERE id = ?');
    $stmt2->execute(array($id));
    $row = $stmt2->fetch();
    echo json_encode(row_to_js($row));
}

function handle_delete($pdo) {
    $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
    if ($id <= 0) {
        send_error(400, 'Missing or invalid id');
    }

    $stmt = $pdo->prepare('DELETE FROM channels_interact WHERE id = ?');
    $stmt->execute(array($id));

    if ($stmt->rowCount() === 0) {
        send_error(404, 'Interaction not found');
    }

    echo json_encode(array('ok' => true));
}

try {
    $pdo = get_pdo();
    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'GET')    { handle_get($pdo); }
    elseif ($method === 'POST')   { handle_post($pdo); }
    elseif ($method === 'PUT')    { handle_put($pdo); }
    elseif ($method === 'DELETE') { handle_delete($pdo); }
    else { send_error(405, 'Method not allowed'); }

} catch (PDOException $e) {
    send_error(500, 'Database error');
} catch (Exception $e) {
    send_error(500, 'Server error');
}
