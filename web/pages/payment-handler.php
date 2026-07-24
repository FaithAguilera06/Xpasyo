<?php
header('Content-Type: application/json');

// This file is no longer needed as all Firebase operations are now handled client-side
// in NOTIFICATION.php and other relevant files

echo json_encode([
    'success' => false,
    'error' => 'This endpoint is deprecated. All Firebase operations are now handled client-side.'
]);
