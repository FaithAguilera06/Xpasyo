<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>XPASYO - Get Started</title>
    <link rel="icon" type="image/png" href="../elements/logo web.png">
    <link rel="stylesheet" href="../style.css">
    <style>
        .container {
            text-align: center;
            padding: 40px 12px;
            background: rgba(0,0,0,0.95);
            border-radius: 16px;
            max-width: 400px;
            margin: 40px auto;
            box-shadow: 0 4px 24px rgba(0,0,0,0.3);
        }
        .container img {
            max-width: 100%;
            height: auto;
            margin-bottom: 30px;
        }
        .cta-buttons {
            display: flex;
            flex-direction: column;
            gap: 15px;
            margin-top: 30px;
        }
        .btn {
            display: block;
            padding: 15px;
            text-align: center;
            border-radius: 5px;
            font-weight: 600;
            text-decoration: none;
            transition: all 0.3s ease;
            width: 92%;
            box-sizing: border-box;
            margin: 0 auto;
        }
        .btn-primary {
            background-color: #FFCC00;
            color: #000;
        }
        .btn-secondary {
            background-color: transparent;
            border: 2px solid #FFCC00;
            color: #FFCC00;
        }
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(255, 204, 0, 0.3);
        }
        p {
            color: #fff;
            margin: 20px 0;
        }
        .btn-back {
            position: absolute;
            top: 10px;
            right: 10px;
            left: auto;
            background-color: white;
            color: #000;
            padding: 10px 20px;
            border-radius: 5px;
            font-weight: 600;
            text-decoration: none;
            transition: all 0.3s ease;
            font-size: 14px;
            z-index: 10;
        }
        .btn-back:hover {
            transform: translateY(-2px);
            background-color: #FFCC00;
        }
        /* Responsive styles */
        @media (max-width: 600px) {
            .container {
                padding: 20px 6px;
                max-width: 95vw;
                margin: 20px auto;
            }
            .container img {
                margin-bottom: 20px;
            }
            .cta-buttons {
                gap: 10px;
                margin-top: 20px;
            }
            .btn {
                padding: 12px;
                font-size: 15px;
                width: 92%;
                margin: 0 auto;
            }
            .btn-back {
                right: 10px;
                left: auto;
                top: 10px;
                padding: 8px 14px;
                font-size: 12px;
            }
            h2 {
                font-size: 20px;
            }
            p {
                font-size: 14px;
            }
            .logo img {
                width: 120px;
            }
        }
        @media (max-width: 400px) {
            .container {
                padding: 10px 2px;
            }
            .btn {
                padding: 10px;
                font-size: 13px;
            }
            h2 {
                font-size: 16px;
            }
        }
    </style>
</head>
<body>
    <a href="INDEX.php" class="btn-back">← BACK</a>
    <div class="logo">
        <img src="../elements/XPASYO.png" alt="XPASYO Logo">
    </div>
    <div class="container">
        <img src="../elements/LOGO-BANNER.png" alt="Logo Banner">
        <h2>GET STARTED WITH XPASYO</h2>
        <p>Join our fitness community today</p>
        
        <div class="cta-buttons">
            <a href="REGISTER.php" class="btn btn-primary">CREATE NEW ACCOUNT</a>
            <a href="LOGIN.php" class="btn btn-secondary">SIGN IN TO EXISTING ACCOUNT</a>
            
        </div>
    </div>
</body>
</html>
