<?php
// Enable error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);

// Show PHP info
phpinfo();

// Show current working directory
echo "<h2>Current Directory:</h2>";
echo getcwd();

// Show files in current directory
echo "<h2>Files in current directory:</h2>";
echo "<pre>";
print_r(scandir('.'));
echo "</pre>";

// Show files in pages directory
echo "<h2>Files in pages directory:</h2>";
if (is_dir('pages')) {
    echo "<pre>";
    print_r(scandir('pages'));
    echo "</pre>";
} else {
    echo "Pages directory not found!";
}

// Show PHP errors
ini_set('log_errors', 1);
ini_set('error_log', '/tmp/php-errors.log');
?>
