<?php
/**
 * API Proxy - Redirige todas las peticiones al backend de Node.js
 * 
 * Este archivo debe estar en /public_html/api/index.php
 */

$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path = str_replace('/api', '', $path);
$path = $path ?: '/';

$backendUrl = 'http://localhost:5000' . $path;

if (!empty($_SERVER['QUERY_STRING'])) {
    $backendUrl .= '?' . $_SERVER['QUERY_STRING'];
}

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $backendUrl);
curl_setopt($ch, CURLOPT_HEADER, false);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

$headers = ['Content-Type: application/json'];

$token = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
if ($token) {
    $headers[] = 'Authorization: ' . $token;
}

curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

if ($_SERVER['REQUEST_METHOD'] === 'POST' || $_SERVER['REQUEST_METHOD'] === 'PUT' || $_SERVER['REQUEST_METHOD'] === 'PATCH') {
    $input = file_get_contents('php://input');
    if ($input) {
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $input);
    }
}

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
curl_close($ch);

http_response_code($httpCode);
header('Content-Type: ' . ($contentType ?: 'application/json'));
echo $response;
?>
