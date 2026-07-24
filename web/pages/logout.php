<?php
session_start();

// Clear all session variables
$_SESSION = [];

// Destroy session data
session_destroy();

// Remove session cookie
if (ini_get("session.use_cookies")) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000,
        $params["path"], $params["domain"],
        $params["secure"], $params["httponly"]
    );
}

// Redirect
header('Location: INDEX.php');
exit;
?>
