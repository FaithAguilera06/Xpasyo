<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Verify Your Email</title>
  <link rel="stylesheet" href="../style.css">
  <style>
    body {
      font-family: 'Segoe UI', sans-serif;
      background-color: #1a1a1a;
      color: #ffffff;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
    }

    .verify-container {
      background-color: #2a2a2a;
      padding: 40px 30px;
      border-radius: 10px;
      max-width: 500px;
      text-align: center;
      box-shadow: 0 0 15px rgba(255, 204, 0, 0.3);
    }

    h2 {
      color: #FFCC00;
      margin-bottom: 20px;
    }

    p {
      margin: 10px 0;
    }

    .btn {
      background-color: #FFCC00;
      color: #000;
      padding: 12px 20px;
      border: none;
      border-radius: 5px;
      font-weight: bold;
      cursor: pointer;
      margin-top: 20px;
      transition: background 0.3s ease;
    }

    .btn:hover {
      background-color: #e6b800;
    }

    #status {
      margin-top: 20px;
      font-style: italic;
      color: #ccc;
    }
  </style>
</head>
<body>
  <div class="verify-container">
    <h2>Verify Your Email</h2>
    <p>We've sent a verification email to your inbox.</p>
    <p>Please click the link inside to verify your email.</p>
    <p>If you didn't receive it, click below to resend:</p>
    <button class="btn" onclick="sendVerificationEmail()">Resend Verification Email</button>
    <p id="status">Checking verification status...</p>
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
    firebase.initializeApp(firebaseConfig);

    const email = localStorage.getItem('pendingEmail');
    const password = localStorage.getItem('pendingPass');
    const statusEl = document.getElementById('status');
    let currentUser = null;

    if (email && password) {
      firebase.auth().signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
          currentUser = userCredential.user;
          sendVerificationEmail();
          checkEmailVerified();
        })
        .catch((error) => {
          statusEl.textContent = "Login failed: " + error.message;
        });
    } else {
      statusEl.textContent = "Missing credentials. Please register again.";
    }

    function sendVerificationEmail() {
      if (currentUser) {
        currentUser.sendEmailVerification()
          .then(() => alert("Verification email sent to " + currentUser.email))
          .catch((error) => alert("Failed to send: " + error.message));
      }
    }

    function checkEmailVerified() {
      const interval = setInterval(() => {
        currentUser.reload().then(() => {
          if (currentUser.emailVerified) {
            clearInterval(interval);
            statusEl.textContent = "✅ Email verified! Redirecting...";
            setTimeout(() => {
              localStorage.removeItem('pendingEmail');
              localStorage.removeItem('pendingPass');
              window.location.href = "login.php";
            }, 2000);
          } else {
            statusEl.textContent = "⏳ Still waiting for email verification...";
          }
        });
      }, 3000);
    }
  </script>
</body>
</html>
