<?php
require_once __DIR__ . '/firebase_config.php';
session_start();

$successMessage = '';
if (isset($_SESSION['success_message'])) {
    $successMessage = $_SESSION['success_message'];
    unset($_SESSION['success_message']);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = $_POST['email'] ?? '';
    $password = $_POST['password'] ?? '';

    try {
        // Sign in using email and password
        $signInResult = $auth->signInWithEmailAndPassword($email, $password);
        $idToken = $signInResult->idToken();
        $verifiedToken = $auth->verifyIdToken($idToken);
        $uid = $verifiedToken->claims()->get('user_id');

   // Get user info from Firebase DB
$userData = $database->getReference('users/' . $uid)->getValue();

// Check approval from either root or inside 'profile'
$approved = $userData['approved'] ?? ($userData['profile']['approved'] ?? false);

if (!filter_var($approved, FILTER_VALIDATE_BOOLEAN)) {
    header('Location: LOGIN.php?error=Account not yet approved');
    exit();
}
        // Start session
        $_SESSION['user_id'] = $uid;
        $_SESSION['email'] = $email;
        $_SESSION['username'] = $userData['username'] ?? 'User';
        $_SESSION['role'] = $userData['role'] ?? 'user';
        $_SESSION['gymId'] = $userData['profile']['gymId'] ?? $uid;

        header('Location: HOME.php');
        exit();

    } catch (\Kreait\Firebase\Exception\Auth\InvalidPassword $e) {
        header('Location: LOGIN.php?error=Invalid password');
        exit();
    } catch (\Kreait\Firebase\Exception\Auth\UserNotFound $e) {
        header('Location: LOGIN.php?error=User not found');
        exit();
    } catch (\Exception $e) {
        error_log('Login error: ' . $e->getMessage());
        header('Location: LOGIN.php?error=Login failed');
        exit();
    }
}
?>
