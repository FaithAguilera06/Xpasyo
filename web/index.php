<?php
// Enable error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);

// Simple test page
echo "<h1>Xpasyo App</h1>";

// Show PHP info
echo "<p>PHP Version: " . phpversion() . "</p>";

// Function to get base URL
function getBaseUrl() {
    $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'];
    return "$protocol://$host";
}

// Show current directory
echo "<h2>Current Directory:</h2>";
echo "<pre>" . __DIR__ . "</pre>";

// List files in root directory
echo "<h2>Files in root directory:</h2>";
$files = scandir(__DIR__);
echo "<ul>";
foreach ($files as $file) {
    if (!in_array($file, ['.', '..', '.htaccess', 'Dockerfile', '000-default.conf'])) {
        $file_url = htmlspecialchars($file, ENT_QUOTES, 'UTF-8');
        echo "<li><a href='$file_url'>$file_url</a></li>";
    }
}
echo "</ul>";

// Check if pages directory exists
$pages_dir = __DIR__ . '/pages';
if (is_dir($pages_dir)) {
    echo "<h2>Available Pages:</h2>";
    echo "<ul>";
    
    // List all PHP files in the pages directory
    $pages = glob($pages_dir . '/*.php');
    foreach ($pages as $page) {
        $page_name = basename($page, '.php');
        $page_url = 'pages/' . rawurlencode($page_name) . '.php';
        echo "<li><a href='$page_url'>$page_name</a></li>";
    }
    
    echo "</ul>";
}

// Add a link to the test page
echo "<p><a href='test.php'>Test PHP Configuration</a></p>";
?>
