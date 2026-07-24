<?php
require_once __DIR__ . '/firebase_config.php';

// Start session for authentication checks
session_start();

// Only allow admin access (you might want to restrict this in production)
// if (!isset($_SESSION['user_id']) || ($_SESSION['role'] ?? '') !== 'admin') {
//     die('Access denied');
// }

function displayArray($array, $level = 0) {
    $output = '';
    $indent = str_repeat('    ', $level);
    
    foreach ($array as $key => $value) {
        if (is_array($value)) {
            $output .= "{$indent}<b>" . htmlspecialchars($key) . "</b>:<br>";
            $output .= displayArray($value, $level + 1);
        } else {
            $output .= "{$indent}<b>" . htmlspecialchars($key) . "</b>: " . 
                     nl2br(htmlspecialchars(is_bool($value) ? ($value ? 'true' : 'false') : $value)) . "<br>";
        }
    }
    
    return $output;
}

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Firebase Database Viewer</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            margin: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 20px;
            border-radius: 5px;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
            border-bottom: 1px solid #eee;
            padding-bottom: 10px;
        }
        .database-content {
            background: #f9f9f9;
            border: 1px solid #ddd;
            border-radius: 4px;
            padding: 15px;
            margin-top: 20px;
            font-family: monospace;
            white-space: pre-wrap;
            max-height: 600px;
            overflow-y: auto;
        }
        .refresh-btn {
            background: #4CAF50;
            color: white;
            border: none;
            padding: 10px 15px;
            border-radius: 4px;
            cursor: pointer;
            margin: 10px 0;
        }
        .refresh-btn:hover {
            background: #45a049;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Firebase Database Viewer</h1>
        <button class="refresh-btn" onclick="window.location.reload()">Refresh Data</button>
        
        <div class="database-content">
            <?php
            try {
                // Get all data from the root of the database
                $reference = $database->getReference('/');
                $data = $reference->getValue();
                
                if (empty($data)) {
                    echo "No data found in the database.";
                } else {
                    echo displayArray($data);
                }
                
                echo "<hr>";
                echo "<h3>Authentication Users</h3>";
                $authUsers = $auth->listUsers($defaultMaxResults = 1000, $defaultBatchSize = 1000);
                $usersArray = [];
                foreach ($authUsers as $user) {
                    $usersArray[$user->uid] = [
                        'email' => $user->email,
                        'displayName' => $user->displayName ?? 'Not set',
                        'emailVerified' => $user->emailVerified ? 'Yes' : 'No',
                        'disabled' => $user->disabled ? 'Yes' : 'No',
                        'createdAt' => $user->metadata->createdAt->format('Y-m-d H:i:s'),
                        'lastLoginAt' => $user->metadata->lastLoginAt ? $user->metadata->lastLoginAt->format('Y-m-d H:i:s') : 'Never'
                    ];
                }
                echo displayArray(['authUsers' => $usersArray]);
                
            } catch (\Exception $e) {
                echo "<div style='color: red;'>Error: " . htmlspecialchars($e->getMessage()) . "</div>";
                echo "<div>File: " . htmlspecialchars($e->getFile()) . " on line " . $e->getLine() . "</div>";
                echo "<pre>" . htmlspecialchars($e->getTraceAsString()) . "</pre>";
            }
            ?>
        </div>
    </div>
</body>
</html>
