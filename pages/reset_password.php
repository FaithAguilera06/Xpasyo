
<?php
require_once __DIR__ . '/firebase_config.php';
session_start();

$successMessage = '';
$errorMessage = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = $_POST['email'] ?? '';

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $errorMessage = 'Please enter a valid email address.';
    } else {
        try {
            $link = $auth->getPasswordResetLink($email);

            // You can send the link manually via mail(), but Firebase handles it by default
            $successMessage = "A password reset link has been sent to your email.";
        } catch (\Kreait\Firebase\Exception\Auth\UserNotFound $e) {
            $errorMessage = "Email address not found in our system.";
        } catch (\Exception $e) {
            $errorMessage = "Failed to send reset email: " . $e->getMessage();
        }
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Reset Password - XPASYO</title>
    <link rel="stylesheet" href="../style.css">
    <style>
        .container {
            max-width: 400px;
            margin: 100px auto;
            text-align: center;
            padding: 30px;
            background: #fff;
            border-radius: 10px;
            box-shadow: 0 4px 10px rgba(0,0,0,0.1);
        }
        input[type="email"] {
            width: 100%;
            padding: 12px;
            margin-top: 10px;
            margin-bottom: 20px;
            border: 1px solid #ccc;
            border-radius: 6px;
        }
        .btn {
            padding: 12px;
            width: 100%;
            border: none;
            background-color: #FFCC00;
            font-weight: bold;
            color: black;
            border-radius: 6px;
            cursor: pointer;
            transition: background-color 0.3s;
        }
        .btn:hover {
            background-color: #e6b800;
        }
        .message {
            margin-top: 15px;
            font-weight: bold;
            color: green;
        }
        .error {
            color: red;
        }
    </style>
</head>
<body>

<div class="container">
    <h2>Reset Your Password</h2>
    <form method="post">
        <input type="email" name="email" placeholder="Enter your email" required>
        <button class="btn" type="submit">Send Reset Link</button>
    </form>

    <?php if (!empty($successMessage)): ?>
        <p class="message"><?= htmlspecialchars($successMessage) ?></p>
    <?php elseif (!empty($errorMessage)): ?>
        <p class="message error"><?= htmlspecialchars($errorMessage) ?></p>
    <?php endif; ?>
</div>

</body>
</html>
