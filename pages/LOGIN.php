<?php
session_start();

// Prevent browser from caching
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");



$error = $_GET['error'] ?? '';
$successMessage = '';
if (isset($_SESSION['success_message'])) {
    $successMessage = $_SESSION['success_message'];
    unset($_SESSION['success_message']);
}
?>

<?php if (!empty($successMessage)): ?>
    <script>
        alert("<?php echo addslashes(htmlspecialchars($successMessage)); ?>");
    </script>
<?php endif; ?>

<!DOCTYPE html>
<html lang="en">
<head>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="icon" type="image/png" href="../elements/logo web.png">

    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>XPASYO - Login</title>
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: 'Arial', sans-serif;
        }
        
        body {
            background-image: url('../elements/LOGIN-BG.gif');
            background-size: cover;
            background-position: center;
            height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            margin: 0;
            padding: 20px;
        }
        
        .logo {
            position: absolute;
            top: 20px;
            left: 20px;
            z-index: 10;
        }
        
        .logo img {
            height: 60px;
            width: auto;
        }
        
        .container {
            background: rgba(0, 0, 0, 0.8);
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            width: 100%;
            max-width: 450px;
            text-align: center;
            color: white;
            position: relative;
        }
        
        .container img {
            max-width: 100%;
            margin-bottom: 30px;
        }
        
        .error-message {
            color: #ff6b6b;
            margin-bottom: 20px;
            font-weight: bold;
        }
        
        form {
            display: flex;
            flex-direction: column;
            gap: 15px;
        }
        
        label {
            display: block;
            margin-bottom: 8px;
            font-weight: bold;
            color: #fff;
            text-transform: uppercase;
            letter-spacing: 1px;
            font-size: 14px;
        }
        
       input[type="email"],
       input[type="password"],
       input[type="text"] {

        width: 100%;
        padding: 15px;
        margin-bottom: 15px;
        border: 2px solid #444;
        border-radius: 5px;
        background-color: rgba(255, 255, 255, 0.1);
        color: white;
        font-size: 16px;
        transition: border-color 0.3s;
}

input[type="email"]:focus,
input[type="password"]:focus,
input[type="text"]:focus {
    outline: none;
    border-color: #ffcc00;
    background-color: rgba(255, 255, 255, 0.15);
}
        
        input[type="email"]:focus,
        input[type="password"]:focus {
            outline: none;
            border-color: #ffcc00;
            background-color: rgba(255, 255, 255, 0.15);
        }
        
        button[type="submit"] {
            background-color: #ffcc00;
            color: #000;
            border: none;
            padding: 15px;
            border-radius: 5px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            transition: background-color 0.3s;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-top: 10px;
        }
        
        button[type="submit"]:hover {
            background-color: #e6b800;
        }
        
        .forgot-password {
            margin-top: 15px;
            color: #aaa;
            font-size: 14px;
        }
        
        .forgot-password a {
            color: #ffcc00;
            text-decoration: none;
        }
        
        .forgot-password a:hover {
            text-decoration: underline;
        }
        
        @media (max-width: 480px) {
            .container {
                padding: 30px 20px;
            }
            
            .logo img {
                height: 50px;
            }
        }
               .btn-back {
            position: absolute;
            top: 20px;
            left: 20px;
            background-color: #FFCC00;
            color: #000;
            padding: 10px 20px;
            border-radius: 5px;
            font-weight: 600;
            text-decoration: none;
            transition: all 0.3s ease;
            font-size: 14px;
        }
        .btn-back:hover {
            transform: translateY(-3px);
            box-shadow: 0 5px 15px rgba(255, 204, 0, 0.3);
        }
    </style>
</head>
<body>
    <div class="logo">
        <img src="../elements/XPASYO.png" alt="XPASYO Logo">
    </div>
    <div class="container">
        <img src="../elements/LOGO-BANNER.png" alt="Logo Banner">
        
        <?php if ($error): ?>
            <div class="error-message">
                <?php echo htmlspecialchars($error); ?>
            </div>
        <?php endif; ?>
        
        <form id="login-form" action="LOGIN_PHP.php" method="post" onsubmit="return validateForm()">
            <a href="SIGNIN.php" class="btn-back">← BACK</a>
            <label for="email">LOG IN TO YOUR ACCOUNT</label>
            <input type="email" id="email" name="email" placeholder="EMAIL ADDRESS" maxlength="50" required>
            <input type="password" id="password" name="password" placeholder="PASSWORD" required minlength="8">
            <i class="fa-solid fa-eye" id="toggleIcon" onclick="togglePassword()" style="
            position: absolute;
            top: 68%;
            right: 60px;
            transform: translateY(-50%);
            cursor: pointer;
            color: #ccc;
            "></i>
            
            <button type="submit">SUBMIT</button>
            
            <div class="forgot-password">
                <a href="reset_password.php"></a>
            </div>

        </form>
    </div>
    
    <!-- Firebase SDKs -->
<script src="https://www.gstatic.com/firebasejs/9.6.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.6.0/firebase-auth-compat.js"></script>

    <script>
         const firebaseConfig = {
    apiKey: "AIzaSyD17c4BbdFzMKCS5H6J7TIQClib7uZd4kQ",
    authDomain: "xpasyo-f5f5f5.firebaseapp.com",
    databaseURL: "https://xpasyo-f5f5f5-default-rtdb.firebaseio.com",
    projectId: "xpasyo-f5f5f5",
    storageBucket: "xpasyo-f5f5f5.appspot.com",
    messagingSenderId: "531244543942",
    appId: "1:531244543942:web:779f5a61dd07f16f8d4cc7",
    measurementId: "G-V33VXJL1V1"
  };

  // ✅ Initialize Firebase
  firebase.initializeApp(firebaseConfig);
    function validateForm() {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        if (!email || !password) {
            alert('Please fill in all fields');
            return false;
        }
        
        if (password.length < 6) {
            alert('Password must be at least 6 characters long');
            return false;
        }
        
        return true;
    }
    function togglePassword() {
    const passwordField = document.getElementById("password");
    const toggleIcon = document.getElementById("toggleIcon");

    if (passwordField.type === "password") {
        passwordField.type = "text";
        toggleIcon.classList.remove("fa-eye");
        toggleIcon.classList.add("fa-eye-slash");
    } else {
        passwordField.type = "password";
        toggleIcon.classList.remove("fa-eye-slash");
        toggleIcon.classList.add("fa-eye");
    }
}
    </script>

    
</body>
</html>
