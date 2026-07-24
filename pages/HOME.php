<?php


require_once __DIR__ . '/firebase_config.php';

// Check if user is logged in
session_start();
if (!isset($_SESSION['user_id'])) {
    header('Location: LOGIN.php');
    exit;
}

// Get user data from session
$userId = $_SESSION['user_id'];
$userEmail = $_SESSION['email'];
$userName = $_SESSION['username'] ?? 'User';
$userRole = $_SESSION['role'] ?? 'user';

// Get user and gym data from Firebase
$userData = [];
$gymData = [];
$debugInfo = [];
try {
    // Debug: Log the user ID being used
    $debugInfo['userId'] = $userId;
    
    // Get user data
    $userRef = $database->getReference("users/{$userId}");
    $userData = $userRef->getValue() ?: [];
    $debugInfo['userData'] = $userData;
    
    // Get gym data if user has a gymId
    $gymId = $userData['profile']['gymId'] ?? $userId;
    $debugInfo['gymId'] = $gymId;
    
    if (!empty($gymId)) {
        $gymRef = $database->getReference("gyms/{$gymId}");
        $gymData = $gymRef->getValue() ?: [];
        $debugInfo['gymData'] = $gymData;
        
        // Debug: Check if we can access the gym data directly
        if (empty($gymData)) {
            $debugInfo['gymDataError'] = 'No gym data found for gymId: ' . $gymId;
        } else {
            $debugInfo['gymDataKeys'] = array_keys($gymData);
        }
    } else {
        $debugInfo['gymDataError'] = 'No gymId found in user profile';
    }
    
    // Log debug info
    error_log('Debug Info: ' . print_r($debugInfo, true));
    
    // Debug: Log the data being fetched
    error_log('User Data: ' . print_r($userData, true));
    error_log('Gym Data: ' . print_r($gymData, true));
    
} catch (Exception $e) {
    // Log error but don't stop execution
    error_log('Error fetching data: ' . $e->getMessage());
}


require_once __DIR__ . '/sidebar.php';
// Generate the sidebar with current page highlighted
$sidebar = generateSidebar('HOME');
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>XPASYO - Dashboard</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css" rel="stylesheet">
    <link rel="icon" type="image/png" href="../elements/logo web.png">
<style>
        /* Sidebar Styles */
        .sidebar {
            width: 250px;
            background-color: #1a1a1a;
            color: white;
            padding: 20px 0;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            position: fixed;
            top: 0;
            bottom: 0;
            left: 0;
            text-align: center;
            box-shadow: 2px 0 5px rgba(0, 0, 0, 0.2);
        }

        .sidebar-content {
            padding: 0 20px;
        }

        .gym-logo {
            width: 180px;
            height: 100px;
            object-fit: contain;
            border: 2px solid #ffcc00;
            border-radius: 8px;
            margin: 0 auto 15px;
            display: block;
            background-color: #2a2a2a;
            padding: 5px;
            box-sizing: border-box;
        }

        .gym-logo-placeholder {
            width: 180px;
            height: 100px;
            border-radius: 8px;
            background: #2a2a2a;
            margin: 0 auto 15px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: #666;
            border: 2px dashed #444;
            padding: 5px;
            box-sizing: border-box;
        }

        .gym-logo-placeholder i {
            font-size: 36px;
            margin-bottom: 5px;
        }

        .sidebar h2 {
            color: #ffcc00;
            margin: 10px 0 5px;
            font-size: 1.4em;
        }

        .fitness-type {
            color: #888;
            margin-bottom: 20px;
            font-size: 0.9em;
        }

        .nav-links {
            margin-top: 20px;
            text-align: left;
        }

        .nav-link {
            display: flex;
            align-items: center;
            padding: 12px 15px;
            color: #bbb;
            text-decoration: none;
            transition: all 0.3s ease;
            border-radius: 4px;
            margin: 5px 0;
        }

        .nav-link i {
            margin-right: 10px;
            width: 20px;
            text-align: center;
        }

        .nav-link:hover, .nav-link.active {
            background-color: #333;
            color: #ffcc00;
            padding-left: 20px;
        }

        .nav-link.active {
            background-color: #333;
            color: #ffcc00;
            font-weight: bold;
        }

        .logo {
            padding: 20px;
            border-top: 1px solid #333;
            margin-top: 20px;
        }

        .logo img {
            max-width: 100%;
            height: auto;
            max-height: 60px;
        }

         .main-content {
            margin-left: 250px;
            flex: 1;
            display: flex;
            flex-direction: column;
            min-height: 100vh;
        }

        
        
        /* Gym Card Styles */
        .gym-card {
            background: white;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            margin-bottom: 20px;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }

        .gym-image {
            height: 200px;
            background-size: cover;
            background-position: center;
            background-repeat: no-repeat;
        }

        .gym-info {
            padding: 20px;
        }

        .gym-title {
            font-size: 1.5em;
            font-weight: bold;
            margin-bottom: 5px;
            color: #333;
        }

        .gym-type {
            font-size: 0.8em;
            color: #666;
            font-weight: normal;
            margin-left: 5px;
        }
        
        .class-type-badge {
            display: inline-block;
            background-color: #f5f5f5;
            border: 1px solid #ddd;
            border-radius: 12px;
            padding: 4px 10px;
            margin: 3px 5px 3px 0;
            font-size: 0.8em;
            line-height: 1.4;
        }
        
        .class-name {
            color: #333;
            font-weight: 500;
            margin-right: 5px;
        }
        
        .class-price {
            color: #e67e22;
            font-weight: 500;
            font-size: 0.9em;
        }
        
        .class-types-container {
            margin: 10px 0 20px;
        }
        
        .class-type-item {
            margin-bottom: 10px;
        }
        
        .checkbox-label {
            display: flex;
            align-items: center;
            cursor: pointer;
            margin-bottom: 5px;
        }
        
        .checkbox-label input[type="checkbox"] {
            margin-right: 8px;
            width: 16px;
            height: 16px;
        }

        .gym-address {
            color: #666;
            margin: 5px 0;
            font-size: 0.9em;
        }

        .gym-address i {
            margin-right: 5px;
            color: #888;
        }

        .gym-description {
            margin-top: 10px;
            color: #555;
            line-height: 1.5;
        }

        .book-button {
            background-color: #4CAF50;
            color: white;
            padding: 8px 20px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
            font-weight: bold;
            transition: background-color 0.3s;
        }

        .book-button:hover {
            background-color: #45a049;
        }

        /* Section Headers */
        .current-gym-section,
        .all-gyms-section {
            margin-bottom: 30px;
        }

        .current-gym-section h2,
        .all-gyms-section h2 {
            color: #333;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 2px solid #eee;
        }

        /* Responsive Design */
        @media (min-width: 768px) {
            .gym-card {
                flex-direction: row;
            }
            
            .gym-image {
                width: 30%;
                height: auto;
                min-height: 200px;
            }
            
            .gym-info {
                width: 70%;
            }
        }
        
        /* User Info Styles */
        .user-info {
            display: flex;
            align-items: center;
            padding: 15px 0;
            border-bottom: 1px solid #333;
            margin-bottom: 20px;
        }
        
        .user-avatar {
            width: 50px;
            height: 50px;
            background-color: #ffcc00;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            font-weight: bold;
            color: #000;
            margin-right: 15px;
        }
        
        .user-details {
            display: flex;
            flex-direction: column;
        }
        
        .user-name {
            font-weight: bold;
            color: #fff;
            margin-bottom: 3px;
        }
        
        .user-email {
            font-size: 12px;
            color: #8d8d8d;
        }
        
        

        html, body {
            height: 100%;
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
            background-color: #F9F9F9;
        }

        .container {
            display: flex;
            height: 100%;
        }

        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px;
            background-color: #fff;
        }

        .header h1 {
            margin: 0;
            font-size: 2.5em;
        }

        #h11 {
            color: black;
        }

        #h12 {
            color: #FFD700;
        }

        .logout-btn {
            background-color: #000;
            color: #FFCC00;
            text-decoration: none;
            padding: 8px 14px;
            border-radius: 30px;
            font-weight: bold;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 6px;
            border: none;
        }

        .logout-btn img {
            width: 18px;
            height: 18px;
            object-fit: contain;
        }

        .content-area {
            flex-grow: 1;
            padding: 20px;
            background-color: #fff;
        }

        .gym-card {
            display: flex;
            background-color: #000;
            color: #fff;
            padding: 20px;
            border-radius: 10px;
            max-width: 900px;
            margin: 20px auto;
            overflow: hidden;
        }

        .gym-image {
            flex: 1;
            background: url('../elements/gym-image.png') center/cover no-repeat;
            border-radius: 10px 0 0 10px;
            height: 200px;
        }

        .gym-info {
            flex: 1.5;
            padding: 20px;
            background-color: white;
            color: black;
            border-radius: 0 10px 10px 0;
        }

        .gym-title {
            font-size: 25px;
            align: left;
        }

        .book-button {
            background-color: #FFCC00;
            color: white;
            padding: 5px;
            text-align: center;
            text-decoration: none;
            cursor: pointer;
            border-radius: 3px;
            display: inline-block;
        }

        .gym-description {
            margin-top: 10px;
        }

        footer {
            background-color: #000;
            color: #FFCC00;
            text-align: center;
            padding: 15px;
            border-top: 6px solid #FFCC00;
        }
        .post-container {
            display: flex;
            text-align: center;
            background-color: white;
            border-radius: 5px;
            box-shadow: 0 2px 5px rgba(0,0,0,1);
            padding: 10px;
            width: 600px;
            margin-left: 30%;
        }
        .post-input {
            flex: 1;
            border: none;
            outline: none;
            font-size: 16px;
            padding: 10px;
        }
        .post-button {
            background-color: #ffcc00;
            border: none;
            border-radius: 5px;
            padding: 10px 20px;
            cursor: pointer;
            font-weight: bold;
            transition: background-color 0.3s;
        }
        .post-button:hover {
            background-color: #f3b600;
        }


        .class-type-badge {
    display: inline-flex;
    align-items: center;
    gap: 1px;
    padding: 2px 2px;
    background-color: #f0f0f0;
    border-radius: 20px;
    font-size: 10px;
    color: #333;
    margin-right: 0px;
    margin-bottom: 3px;
}

.class-name {
    font-weight: 600;
}

.class-price {
    color:rgb(112, 87, 10);
    font-weight: 700;
}

.gym-name-block {
    text-align: left;
    margin-bottom: 10px;
}

.gym-name {
    font-size: 25px;
    font-weight: bold;
    color: #222;
}

.gym-type {
    font-size: 12px;
    color: #00796b;
    font-weight: 500;
}


    </style>
</head>
<body>
    <div class="container">
        <!-- Sidebar -->
         <?php echo $sidebar; ?>

        <!-- Main Content -->
        <div class="main-content">
            <div class="header">
                <h1><span id="h11">YOUR</span> <span id="h12">HOME</span></h1>
                <a class="logout-btn" href="INDEX.php">
                    LOG OUT
                    <img src="../elements/PROFILE.png" alt="User Icon">
                </a>
            </div>

            <div class="content-area">
                <!-- Current Gym Section -->
                <?php if (!empty($gymData)): 
                    // Debug: Log the gym data being used for display
                    error_log('Displaying gym data: ' . print_r([
                        'gym_name' => $gymData['gym_name'] ?? 'Not set',
                        'gymInfo_name' => $gymData['gymInfo']['name'] ?? 'Not set',
                        'gym_logo' => $gymData['gym_logo'] ?? 'Not set',
                        'gymInfo_logo' => $gymData['gymInfo']['logo'] ?? 'Not set',
                        'uploads' => !empty($gymData['uploads']) ? 'Exists' : 'Empty',
                        'address' => $gymData['gym_address'] ?? ($gymData['gymInfo']['address'] ?? 'Not set')
                    ], true));
                ?>
                    <div class="current-gym-section">
                        <h2>Your Gym</h2>
                        <div class="gym-card">
                            <?php 
                            // Get gym logo with fallbacks
                            $gymLogo = '';
                            $isBase64 = false;
                            
                            // Check different possible locations for the logo
                            if (!empty($gymData['gym_logo'])) {
                                $gymLogo = $gymData['gym_logo'];
                            } elseif (!empty($gymData['uploads']['gym-logo'])) {
                                $gymLogo = $gymData['uploads']['gym-logo'];
                            } elseif (!empty($gymData['gymInfo']['logo'])) {
                                $gymLogo = $gymData['gymInfo']['logo'];
                            }
                            
                            // Check if logo is an array (from our new format) or a string (old format)
                            if (is_array($gymLogo) && !empty($gymLogo['data'])) {
                                $gymLogo = $gymLogo['data'];
                                $isBase64 = true;
                            } elseif (is_string($gymLogo) && strpos($gymLogo, 'data:image/') === 0) {
                                $isBase64 = true;
                            }
                            
                            if (!empty($gymLogo)): ?>
                                <?php if ($isBase64): ?>
                                    <div class="gym-image" style="background-image: url('<?php echo $gymLogo; ?>');">
                                        <img src="<?php echo $gymLogo; ?>" alt="Gym Logo" style="display: none;">
                                    </div>
                                <?php else: ?>
                                    <div class="gym-image" style="background-image: url('<?php echo htmlspecialchars($gymLogo); ?>');">
                                        <img src="<?php echo htmlspecialchars($gymLogo); ?>" alt="Gym Logo" style="display: none;">
                                    </div>
                                <?php endif; ?>
                            <?php else: ?>
                                <div class="gym-image" style="background-color: #f0f0f0; display: flex; align-items: center; justify-content: center; color: #666;">
                                    No Image Available
                                </div>
                            <?php endif; ?>
                            <div class="gym-info">
                                <table width="100%">
                                    <tr>
                                        <th width="70%">
                                            <div class="gym-title">
                                                <?php 
// Get gym name with fallbacks
$displayName = $gymData['gym_name'] ?? 
               $gymData['gymInfo']['name'] ?? 
               'GYM NAME';

// Get fitness type with fallbacks
$fitnessType = $gymData['gymInfo']['fitnessType'] ??
               $gymData['fitness_type'] ??
               $gymData['type'] ??
               '';
?>

<div class="gym-name-block">
    <div class="gym-name"><?= htmlspecialchars($displayName) ?></div>
    
    <?php if (!empty($fitnessType)): ?>
        <div class="gym-type"><?= htmlspecialchars(ucfirst($fitnessType)) ?></div>
    <?php endif; ?>
</div>

                                                <?php 
// Get class types with fallback
$classTypes = $gymData['gymInfo']['classTypes'] ?? [];
if (!empty($classTypes)) { 
    foreach ($classTypes as $class): ?>
        <div class="class-type-badge">
            <span class="class-name"><?php echo htmlspecialchars($class['name']); ?></span>
            <span class="class-price">₱<?php echo htmlspecialchars($class['price']); ?></span>
        </div>
    <?php 
    endforeach;
} ?>
                                            </div>
                                    
                                        </th>
                                        <th width="40%" style="text-align: right;">
                                            <a href="GYM.php" class="book-button">MANAGE GYM</a>
                                        </th>
                                    </tr>
                                </table>

                                <?php 
                                            // Get address with fallbacks
                                            $addressParts = [];
                                            
                                            // Add address from various possible locations
                                            if (!empty($gymData['gym_address'])) $addressParts[] = $gymData['gym_address'];
                                            if (!empty($gymData['gymInfo']['address'])) $addressParts[] = $gymData['gymInfo']['address'];
                                            if (!empty($gymData['address'])) $addressParts[] = $gymData['address'];
                                            
                                            // Add district if available
                                            if (!empty($gymData['gymInfo']['district'])) {
                                                $addressParts[] = $gymData['gymInfo']['district'];
                                            } elseif (!empty($gymData['district'])) {
                                                $addressParts[] = $gymData['district'];
                                            }
                                            
                                            // Remove any empty values and duplicates
                                            $addressParts = array_filter($addressParts);
                                            $addressParts = array_unique($addressParts);
                                            
                                            if (!empty($addressParts)): ?>
                                                <div class="gym-address">
                                                    <i class="fas fa-map-marker-alt"></i> 
                                                    <?php echo htmlspecialchars(implode(', ', $addressParts)); ?>
                                                </div>
                                            <?php endif; ?>
                                
                            </div>
                            
                        </div>
                        <h2>DESCRIPTION</h2><BR>
                         <?php if (!empty($gymData['gymInfo']['description'])): ?>
                                    <div class="gym-description">
                                        <?php echo nl2br(htmlspecialchars($gymData['gymInfo']['description'])); ?>
                                    </div>
                                <?php endif; ?>
                    </div>
                <?php endif; ?>

            

        </div>
                        <footer>
                &copy; 2025 XPASYO. All rights reserved.
            </footer>
    </div>
</body>
</html>
