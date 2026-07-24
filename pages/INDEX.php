<?php
require_once __DIR__ . '/firebase_config.php';
session_start();

// SAFELY GET session values (no more warnings)
$userId = $_SESSION['user_id'] ?? null;
$userEmail = $_SESSION['email'] ?? null;
$userName = $_SESSION['username'] ?? 'Guest';
$userRole = $_SESSION['role'] ?? 'guest';

// Initialize data containers
$userData = [];
$gymData = [];
$debugInfo = [];

// Fetch Firebase data only if logged in
if ($userId) {
    try {
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

            if (empty($gymData)) {
                $debugInfo['gymDataError'] = 'No gym data found for gymId: ' . $gymId;
            } else {
                $debugInfo['gymDataKeys'] = array_keys($gymData);
            }
        } else {
            $debugInfo['gymDataError'] = 'No gymId found in user profile';
        }

        error_log('Debug Info: ' . print_r($debugInfo, true));
        error_log('User Data: ' . print_r($userData, true));
        error_log('Gym Data: ' . print_r($gymData, true));

    } catch (Exception $e) {
        error_log('Error fetching data: ' . $e->getMessage());
    }
}
?>


<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Xpasyο - Your Way to Fitness</title>
    <link rel="icon" type="image/png" href="../elements/logo web.png">
    <style>
        html, body {
            margin: 0;
            padding: 0;
            width: 100%;
            overflow-x: hidden;
        }

        body {
            font-family: 'Arial', sans-serif;
            background-color: #f4f4f4;
        }

        * {
            box-sizing: border-box;
        }

        header {
            background-color: #000;
            border-bottom: 7px solid #FFCC00; /* yellow bottom border */
            color: #FFCC00;
            padding: 8px 10px;      /* Reduce top/bottom padding */
            display: flex;
            align-items: center;
            justify-content: space-between;
            width: 100%;
            box-sizing: border-box;
            min-height: 60px;       /* Optional: set a minimum height */
        }

 footer {
            background-color: #000;
            color: #FFCC00;
            text-align: center;
            padding: 15px;
            border-top: 6px solid #FFCC00;
            width: 100%;
            box-sizing: border-box;
        }
        .logo img {
            width: 20%; /* adjust as needed */
        }

        .user-icon img {
            width: 60%; /* adjust as needed */
        }
        
        .search-bar {
            display: flex;
            justify-content: center;
            margin: 20px 0;
            height: 100px;
            align-items: center;
            
        }

        .search-bar input {
             height: 100%;
            padding: 10px;
            width: 300px;
            border: 1px solid #ccc;
            border-radius: 5px;
            margin-right: 5px;
        }

        .search-bar button {
            padding: 10px;
            background-color: #FFCC00;
            border: none;
            border-radius: 5px;
            cursor: pointer;
        }

        .gym-card {
            display: flex;
            background-color: #000;
            color: #fff;
            padding: 20px;
            border-radius: 10px;
            max-width: 800px;
            max-height: 300px;
            margin: 20px auto;
            overflow: hidden;
        }

        .gym-image {
            flex: 1;
            border-radius: 10px 0 0 10px;
            height: 200px;
            background-size: cover;
            background-position: center;
            background-repeat: no-repeat;
        }

        .gym-info {
    flex: 1.5;
    padding: 10px;
    background-color: white;
    color: black;
    border-radius: 0 10px 10px 0;
    text-align: left; /* ensures left text alignment */
}


        .gym-title {
            font-size: 20px;
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
            font-size:15px;
        }

        .gym-description {
            margin-top: 15px;
            font-size:smaller;
        }
    #headertext {
    text-align: center;
    color: #333333;
    font-size: 2rem;
    font-weight: bold;
    margin-top: 20px;
}

.class-type-chip {
    display: inline-block;
    background-color: #FFCC00;
    color: black;
    padding: 6px 12px;
    margin: 4px 4px 0 0;
    border-radius: 16px;
    font-size: 9px;
    font-weight: 500;
    white-space: nowrap;
}

.class-type-chip-container {
    display: flex;
    flex-wrap: wrap; /* Allows chips to wrap if they overflow */
    gap: 4px;
}

.fitness-type-display {
    display: inline-block;
    background-color: #e0f7fa;
    color: #00796b;
    padding: 6px 12px;
    border-radius: 16px;
    font-size: 10px;
    font-weight: 600;
    align: left;
}

.district-highlight {
    color: #00796b;
    font-weight: bold;
}

        /* Responsive styles for mobile devices */
        @media screen and (max-width: 768px) {
            /* Adjust header layout for mobile */
            header {
                padding: 10px 15px;
            }

            /* Make logo larger on mobile */
            .logo img {
                width: 35%;
            }

            /* Make user icon much larger on mobile */
            .user-icon {
                width: 32px;
                height: 32px;
                margin: 0 4px;/* Move icon a bit to the left */
            }

            .user-icon img {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }

            /* Make gym cards responsive on mobile */
            .gym-card {
                flex-direction: column;
                max-width: 95%;
                max-height: none;
                margin: 15px auto;
            }

            .gym-image {
                flex: none; /* Reset flex property for column layout */
                width: 100%;
                height: 150px;
                border-radius: 10px 10px 0 0;
                background-size: cover;
                background-position: center;
                background-repeat: no-repeat;
            }

            .gym-info {
                width: 100%;
                border-radius: 0 0 10px 10px;
                padding: 15px;
            }

            /* Adjust table layout for mobile */
            .gym-info table {
                width: 100%;
            }

            .gym-info th {
                display: block;
                width: 100% !important;
                text-align: left;
            }

            .gym-info th:first-child {
                margin-bottom: 10px;
            }

            .gym-info th:last-child {
                text-align: center;
            }

            /* Adjust gym title for mobile */
            .gym-title {
                font-size: 18px;
            }

            /* Adjust fitness type display for mobile */
            .fitness-type-display {
                font-size: 11px;
                padding: 8px 14px;
            }

            /* Adjust class type chips for mobile */
            .class-type-chip {
                font-size: 10px;
                padding: 8px 14px;
            }

            /* Adjust gym address for mobile */
            .gym-address {
                font-size: 12px !important;
            }

            /* Adjust gym description for mobile */
            .gym-description {
                font-size: 12px !important;
            }

            /* Adjust book button for mobile */
            .book-button {
                padding: 8px 16px;
                font-size: 16px;
                width: 100%;
                display: block;
                text-align: center;
            }

            /* Adjust header text for mobile */
            #headertext {
                font-size: 1.5rem;
                margin-top: 15px;
            }

            /* Adjust footer for mobile */
            footer {
                padding: 15px;
            }
        }

        /* Modal styles for APK download */
        .apk-modal {
            display: none; /* Hidden by default */
            position: fixed; /* Stay in place */
            z-index: 1001; /* Sit on top */
            left: 0;
            top: 0;
            width: 100%; /* Full width */
            height: 100%; /* Full height */
            overflow: auto; /* Enable scroll if needed */
            background-color: rgba(0,0,0,0.6); /* Black w/ opacity */
            justify-content: center;
            align-items: center;
        }

        .apk-modal-content {
            background-color: #fff;
            color: #000;
            margin: auto;
            padding: 25px;
            border: 1px solid #888;
            width: 90%;
            max-width: 450px;
            border-radius: 10px;
            text-align: center;
            position: relative;
            animation: fadeIn 0.3s;
        }

        @keyframes fadeIn {
            from {opacity: 0;}
            to {opacity: 1;}
        }

        .apk-modal-close {
            color: #aaa;
            position: absolute;
            top: 10px;
            right: 20px;
            font-size: 28px;
            font-weight: bold;
            cursor: pointer;
        }

        .apk-modal-buttons {
            margin-top: 25px;
            display: flex;
            justify-content: center;
            gap: 15px;
        }

        .apk-modal-buttons button {
            padding: 12px 25px;
            border-radius: 8px;
            border: none;
            cursor: pointer;
            font-size: 16px;
            font-weight: bold;
        }

        #apk-proceed-btn {
            background-color: #FFCC00;
            color: black;
        }

        #apk-cancel-btn {
            background-color: #e0e0e0;
            color: #333;
        }

        .user-icon {
            position: relative;
            display: inline-block;
            margin-right: 30px;    /* Add this line to move it left from the edge */
        }

        .profile-tooltip {
            visibility: hidden;
            width: 240px;
            background: #222;
            color: #fff;
            text-align: center;
            border-radius: 6px;
            padding: 8px 12px;
            position: absolute;
            z-index: 100;
            top: 50%;
            left: auto;
            right: 110%;
            transform: translateY(-50%);
            opacity: 0;
            transition: opacity 0.2s;
            font-size: 13px;
            pointer-events: none;
        }

        .user-icon:hover .profile-tooltip,
        .user-icon:focus .profile-tooltip {
            visibility: visible;
            opacity: 1;
        }

        .profile-info-box {
            background: #222;
            color: #fff;
            border-radius: 8px;
            padding: 6px 14px;      /* Reduce padding */
            font-size: 13px;        /* Slightly smaller font */
            margin-right: 10px;
            max-width: 600px;
            text-align: left;
            display: inline-block;
            vertical-align: middle;
            white-space: nowrap;
        }
        .user-icon {
            display: flex;
            align-items: center;
            text-decoration: none;
            gap: 10px;
        }
        .user-icon img {
            width: 32px;
            height: 32px;
        }
    </style>
</head>
<body>
    <header>
        <div class="logo"><img src="../elements/XPASYO - LOGO.png" alt="Xpasyο Logo"></div>
        <a class="user-icon" href="#" aria-label="User Profile" id="profileIcon">
            <img src="../elements/PROFILE.png" alt="User Profile Icon">
        </a>
    </header>
    
    <div class="search-bar">
          <form method="GET">
        <input type="text" name="query" placeholder="SEARCH GYM HERE" aria-label="Search Gym"
               value="<?php echo htmlspecialchars($_GET['query'] ?? ''); ?>">
        <button type="submit" aria-label="Search Button">
            <img src="../elements/SEARCH.png" width="20px" height="20px">
        </button>
    </form>
    </div>

    
                <!-- All Gyms Section -->
                <div class="all-gyms-section">
                    <h2 id="headertext">AVAILABLE GYMS</h2>
                    <?php
                    try {
                        // Get all gyms from the database
                        $gymsRef = $database->getReference('gyms');
                        $allGyms = $gymsRef->getValue() ?: [];
                        $searchQuery = isset($_GET['query']) ? strtolower(trim($_GET['query'])) : '';

if (!empty($searchQuery)) {
    $filteredGyms = [];

    foreach ($allGyms as $gymId => $gym) {
        // Normalize gymInfo
        if (!isset($gym['gymInfo']) && !empty($gym['name'])) {
            $gym = ['gymInfo' => $gym];
        } elseif (!isset($gym['gymInfo'])) {
            continue;
        }

        $gymInfo = $gym['gymInfo'];

        // Build searchable string
        $name = strtolower($gymInfo['name'] ?? $gymInfo['gymName'] ?? '');
        $type = strtolower($gymInfo['fitnessType'] ?? $gymInfo['type'] ?? '');
        $address = strtolower($gymInfo['address'] ?? '');
        $district = strtolower($gymInfo['district'] ?? '');
        $description = strtolower($gymInfo['description'] ?? '');

        $searchable = "$name $type $address $district $description";

        if (strpos($searchable, $searchQuery) !== false) {
            $filteredGyms[$gymId] = $gym;
        }
    }

    $allGyms = $filteredGyms; // Use filtered result
}
                        
                        // Debug: Log the number of gyms found
                        error_log('Total gyms found in database: ' . count($allGyms));
                        
                        // --- FILTER: Only show gyms whose user profile is approved ---
                        $usersRef = $database->getReference('users');
                        $allUsers = $usersRef->getValue() ?: [];
                        $approvedGyms = [];
                        foreach ($allGyms as $gymId => $gym) {
                            $approved = $allUsers[$gymId]['profile']['approved'] ?? false;
                            if ($approved) {
                                $approvedGyms[$gymId] = $gym;
                            }
                        }
                        $allGyms = $approvedGyms;
                        // --- END FILTER ---
                        
                        if (empty($allGyms)) {
                            echo '<p>No gyms found.</p>';
                        } else {
                            $gymCount = 0;
                            foreach ($allGyms as $gymId => $gym) {
                                // Debug: Log each gym being processed
                                error_log('Processing gym ID: ' . $gymId);
                                error_log('Gym data: ' . print_r($gym, true));
                                
                                // Skip if gym data is empty
                                if (empty($gym)) continue;
                                
                                // Normalize gym data structure
                                if (!isset($gym['gymInfo']) && !empty($gym['name'])) {
                                    // If gym data is at root level, move it to gymInfo
                                    $gym = ['gymInfo' => $gym];
                                } else if (isset($gym['gymInfo'])) {
                                    // Make sure gymInfo exists
                                    $gym['gymInfo'] = $gym['gymInfo'] ?: [];
                                } else {
                                    // Skip if no valid gym data structure found
                                    continue;
                                }
                                
                                $gymCount++;
                                ?>
                                <div class="gym-card">
                                    <?php 
                                    // Handle logo from multiple possible locations
                                    $gymLogo = '';
                                    $isBase64 = false;
                                    
                                    // Function to safely get logo data from different structures
                                    $getLogoData = function($logo) use (&$isBase64) {
                                        if (empty($logo)) return '';
                                        
                                        // If it's an array, try to get the data or URL
                                        if (is_array($logo)) {
                                            if (isset($logo['data']) && is_string($logo['data'])) {
                                                $logo = $logo['data'];
                                            } elseif (isset($logo['url']) && is_string($logo['url'])) {
                                                $logo = $logo['url'];
                                            } else {
                                                return '';
                                            }
                                        }
                                        
                                        // Check if it's a base64 string
                                        if (is_string($logo) && strpos($logo, 'data:image') === 0) {
                                            $isBase64 = true;
                                        }
                                        
                                        return $logo;
                                    };
                                    
                                    // Check possible logo locations
                                    if (!empty($gym['uploads']['gym-logo'])) {
                                        $gymLogo = $getLogoData($gym['uploads']['gym-logo']);
                                    } 
                                    if (empty($gymLogo) && !empty($gym['gym_logo'])) {
                                        $gymLogo = $getLogoData($gym['gym_logo']);
                                    }
                                    if (empty($gymLogo) && !empty($gym['gymInfo']['gym_logo'])) {
                                        $gymLogo = $getLogoData($gym['gymInfo']['gym_logo']);
                                    }
                                    if (empty($gymLogo) && !empty($gym['gymInfo']['logo'])) {
                                        $gymLogo = $getLogoData($gym['gymInfo']['logo']);
                                    }
                                    
                                    // Output the logo or placeholder
                                    if (!empty($gymLogo)): 
                                        $logoStyle = $isBase64 
                                            ? "background-image: url('" . htmlspecialchars($gymLogo) . "');"
                                            : "background-image: url('" . htmlspecialchars($gymLogo) . "');";
                                    ?>
                                        <div class="gym-image" style="<?php echo $logoStyle; ?>"></div>
                                    <?php else: ?>
                                        <div class="gym-image" style="background-color: #f0f0f0; display: flex; align-items: center; justify-content: center; color: #666;">
                                            <i class="fas fa-dumbbell" style="font-size: 36px; color: #999;"></i>
                                        </div>
                                    <?php endif; ?>
                                    <div class="gym-info">
                                        <table width="100%">
                                            <tr>
                                                <th width="70%">
                                                    <div class="gym-title">
                                                        <?php 
                                                        $gymName = $gym['gymInfo']['name'] ?? 
                                                                $gym['gymInfo']['gymName'] ?? 
                                                                $gym['name'] ?? 'GYM NAME';
                                                        echo htmlspecialchars($gymName);
                                                        ?>
                                                        <br>
                                                        <?php
$fitnessType = $gym['gymInfo']['fitnessType'] ??
               $gym['gymInfo']['type'] ??
               $gym['fitnessType'] ??
               $gym['type'] ?? null;

if (!empty($fitnessType)):
?>
    <div class="fitness-type-display">
        <span class="fitness-value"><?= strtoupper(htmlspecialchars($fitnessType)) ?></span>
    </div>
<?php endif; ?>
                                                        
                                                        
                                                        
                                                        <div class="class-type-chip-container">
                                                            <?php
                                                            $classTypes = $gym['gymInfo']['classTypes'] ?? [];
                                                            if (!empty($classTypes)) { 
                                                                foreach ($classTypes as $class) { 
                                                                    if (is_array($class) && isset($class['name'])) {
                                                                        echo '<div class="class-type-chip">' . htmlspecialchars($class['name']) . '</div>';
                                                                     }
                                                                     }
                                                                     }
                                                                     ?>
                                                        </div>
                                                    </div><BR>
                                               <?php 
$address = $gym['gymInfo']['address'] ?? $gym['address'] ?? '';
$district = $gym['gymInfo']['district'] ?? $gym['district'] ?? '';

// Set a maximum character length for the address
$maxAddressLength = 40;

if (!empty($address) || !empty($district)): 
?>
    <div class="gym-address" style="font-size: 13px;">
        <i class="fas fa-map-marker-alt"></i> 
        <?php if (!empty($address)) : ?>
            <?= htmlspecialchars(strlen($address) > $maxAddressLength ? substr($address, 0, $maxAddressLength) . '...' : $address) ?><br>
        <?php endif; ?>
        <?php if (!empty($district)) : ?>
            <span class="district-highlight"><?= htmlspecialchars($district) ?></span>
        <?php endif; ?>
    </div>
<?php endif; ?>


                                               
                                       <?php 
$description = $gym['gymInfo']['description'] ?? $gym['description'] ?? '';
if (!empty($description)): 
?>
    <div class="gym-description" style="font-size: 11px;">
        <?php echo nl2br(htmlspecialchars(substr($description, 0, 150) . (strlen($description) > 150 ? '...' : ''))); ?>
    </div>
<?php endif; ?>


                                        </th>
                                        <th width="30%" style="text-align: right;">
                                                    <a href="#" class="book-button" onclick="showApkModal(event)">BOOK GYM</a>
                                                </th>
                                            </tr>
                                        </table>
                                    </div>
                                </div>
                                <?php
                            }
                        }
                    } catch (Exception $e) {
                        echo '<p>Error loading gyms: ' . htmlspecialchars($e->getMessage()) . '</p>';
                        error_log('Error loading gyms: ' . $e->getMessage());
                    }
                    ?>
                </div>
    

 
        <footer>
                &copy; 2025 XPASYO. All rights reserved.
            </footer>

    <!-- APK Download Modal -->
    <div id="apk-download-modal" class="apk-modal">
        <div class="apk-modal-content">
            <span class="apk-modal-close">&times;</span>
            <h2 style="font-weight: bold;">Download Application</h2>
            <p style="margin-top: 15px; font-size: 16px;">
                To book a gym as client or coach, you need our Android app. Clicking 'Proceed' will download the installer (APK file).
                <br><br>
                <strong>Note:</strong> This is intended for Android devices only.
            </p>
            <div class="apk-modal-buttons">
                <button id="apk-cancel-btn">Cancel</button>
                <button id="apk-proceed-btn">Proceed</button>
            </div>
        </div>
    </div>

    <!-- Gym Owner Modal Popup -->
    <div id="gymOwnerModal" style="display:none; position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.5); z-index:2000; align-items:center; justify-content:center;">
      <div style="background:#fff; color:#222; padding:28px 24px; border-radius:10px; max-width:350px; margin:auto; text-align:center; box-shadow:0 2px 16px rgba(0,0,0,0.3);">
        <div style="font-size:16px; margin-bottom:18px;">
          Are you a gym owner? This section is for gym owners to register or log in to manage their gym.
        </div>
        <div style="display:flex; gap:16px; justify-content:center;">
          <button id="gymOwnerCancelBtn" style="padding:8px 18px; border-radius:6px; border:none; background:#888; color:#fff; font-size:14px; cursor:pointer;">Cancel</button>
          <button id="gymOwnerProceedBtn" style="padding:8px 18px; border-radius:6px; border:none; background:#FFCC00; color:#222; font-size:14px; font-weight:bold; cursor:pointer;">Proceed</button>
            </div>
        </div>
    </div>

    <script>
        const apkModal = document.getElementById('apk-download-modal');
        const proceedBtn = document.getElementById('apk-proceed-btn');
        const cancelBtn = document.getElementById('apk-cancel-btn');
        const closeBtn = document.querySelector('.apk-modal-close');

        // --- Set the actual path to your APK file here ---
        const apkFileUrl = '/XPASYO_DRAFT/elements/XPASYO v2.apk'; 

        function showApkModal(event) {
            // Prevent the default link behavior
            if (event) {
                event.preventDefault();
            }
            // Use 'flex' to enable centering
            apkModal.style.display = 'flex';
        }

        function hideApkModal() {
            apkModal.style.display = 'none';
        }

        // When the user clicks on "Proceed", download the file
        proceedBtn.onclick = function() {
            // Create a temporary <a> element for download
            const a = document.createElement('a');
            a.href = apkFileUrl;
            a.download = 'XPASYO v1.apk'; // Set the filename for the download
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            hideApkModal();
        }

        // When the user clicks on "Cancel" or the close button, close the modal
        cancelBtn.onclick = hideApkModal;
        closeBtn.onclick = hideApkModal;

        // When the user clicks anywhere outside of the modal, close it
        window.onclick = function(event) {
            if (event.target == apkModal) {
                hideApkModal();
            }
        }
    </script>

    <script>
    // Modal logic for gym owner
    const gymOwnerModal = document.getElementById('gymOwnerModal');
    const profileIcon = document.getElementById('profileIcon');
    const gymOwnerCancelBtn = document.getElementById('gymOwnerCancelBtn');
    const gymOwnerProceedBtn = document.getElementById('gymOwnerProceedBtn');

    profileIcon.onclick = function(e) {
      e.preventDefault();
      gymOwnerModal.style.display = 'flex';
    };
    gymOwnerCancelBtn.onclick = function() {
      gymOwnerModal.style.display = 'none';
    };
    gymOwnerProceedBtn.onclick = function() {
      window.location.href = 'SIGNIN.php';
    };
    // Close modal if clicking outside the box
    window.onclick = function(event) {
      if (event.target === gymOwnerModal) {
        gymOwnerModal.style.display = 'none';
      }
    };
    </script>

   

    <!-- Popup Modal -->
    <div id="popupModal" style="display:none; position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.5); z-index:1000; align-items:center; justify-content:center;">
      <div style="background:#fff; padding:24px; border-radius:8px; max-width:320px; margin:auto; text-align:center;">
        <span id="popupMessage"></span>
        <br><br>
        <button onclick="closePopup()">OK</button>
      </div>
    </div>

    <script>
    function showPopup(message) {
      document.getElementById('popupMessage').innerText = message;
      document.getElementById('popupModal').style.display = 'flex';
    }
    function closePopup() {
      document.getElementById('popupModal').style.display = 'none';
    }
    </script>

</body>
</html>
