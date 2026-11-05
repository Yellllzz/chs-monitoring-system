<?php
// backend/config/sms.php

define('SEMAPHORE_API_KEY', '7172a8af93d51c7933735eb1daf38f41'); 
define('SENDER_NAME', 'SEMAPHORE'); // Use 'SEMAPHORE' unless you registered a custom sender name

function sendSMS($number, $message) {
    if (empty($number) || empty($message)) return false;

    // Standardize Philippine mobile numbers (e.g., 09171234567)
    $formattedNumber = preg_replace('/[^0-9]/', '', $number);
    if (strlen($formattedNumber) === 10 && substr($formattedNumber, 0, 1) === '9') {
        $formattedNumber = '0' . $formattedNumber;
    }

    $ch = curl_init();
    $parameters = [
        'apikey'     => SEMAPHORE_API_KEY,
        'number'     => $formattedNumber,
        'message'    => $message,
        'sendername' => SENDER_NAME
    ];

    curl_setopt($ch, CURLOPT_URL, 'https://api.semaphore.co/api/v4/messages');
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($parameters));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

    $response = curl_exec($ch);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($curlError) {
        error_log("Semaphore cURL Error: " . $curlError);
        return false;
    }

    $result = json_decode($response, true);

    // Semaphore returns an array of message objects on success
    if (is_array($result) && isset($result[0]['status'])) {
        return true;
    }

    error_log("Semaphore API Error Response: " . $response);
    return false;
}
?>