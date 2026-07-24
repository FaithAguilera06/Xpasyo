<?php
// Enable error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);
?>
<!DOCTYPE html>
<html>
<head>
    <title>Test Page</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; }
        .container { max-width: 800px; margin: 0 auto; }
        .success { color: green; font-weight: bold; }
        .info { background: #f4f4f4; padding: 10px; border-left: 4px solid #3498db; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Test Page</h1>
        <p class="success">If you can see this, PHP is working correctly!</p>
        
        <div class="info">
            <h3>Server Information:</h3>
            <p>PHP Version: <?php echo phpversion(); ?></p>
            <p>Server Software: <?php echo $_SERVER['SERVER_SOFTWARE'] ?? 'N/A'; ?></p>
            <p>Document Root: <?php echo $_SERVER['DOCUMENT_ROOT'] ?? 'N/A'; ?></p>
        </div>
        
        <p><a href="/">← Back to Home</a></p>
    </div>
</body>
</html>
