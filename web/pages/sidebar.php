<?php
// Include Firebase configuration
require_once __DIR__ . '/firebase_config.php';

// Initialize Firebase if not already done
if (!isset($database) && class_exists('\Kreait\Firebase\Factory')) {
    $factory = (new \Kreait\Firebase\Factory)
        ->withServiceAccount(__DIR__ . '/json_files/serviceAccountKey.json');
    
    $database = $factory->createDatabase();
}

function generateSidebar($currentPage = '') {
    global $database;
    // Start the session if not already started
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }

    // Check if user is logged in
    if (!isset($_SESSION['user_id'])) {
        header("Location: INDEX.php");
        exit();
    }

    // Include Firebase configuration
    require_once __DIR__ . '/firebase_config.php';

    try {
        // Get user data
        $userId = $_SESSION['user_id'];
        $userRef = $database->getReference("users/{$userId}");
        $userData = $userRef->getValue() ?: [];

        // Get gym data
        $gymId = $userData['profile']['gymId'] ?? $userId;
        $gymData = [];
        
        if (!empty($gymId)) {
            $gymRef = $database->getReference("gyms/{$gymId}");
            $gymData = $gymRef->getValue() ?: [];
            $_SESSION['gym_data'] = $gymData; // Cache in session
        }

        // Get gym logo with fallbacks
        $gymLogo = '';
        $isBase64 = false;
        
        // Debug: Log the structure of gymData
        error_log('Gym Data Structure: ' . print_r($gymData, true));
        
        // Check all possible logo locations
        $logoFound = false;
        
        // Check gym_logo first
        if (!empty($gymData['gym_logo'])) {
            error_log('Found logo in gym_logo: ' . print_r($gymData['gym_logo'], true));
            if (is_array($gymData['gym_logo']) && !empty($gymData['gym_logo']['data'])) {
                $gymLogo = $gymData['gym_logo']['data'];
                $isBase64 = true;
                $logoFound = true;
                error_log('Using gym_logo data (base64)');
            } else {
                $gymLogo = $gymData['gym_logo'];
                $logoFound = true;
                error_log('Using gym_logo as direct URL');
            }
        } 
        
        // Check gymInfo.logo if not found yet
        if (!$logoFound && !empty($gymData['gymInfo']['logo'])) {
            error_log('Found logo in gymInfo.logo: ' . print_r($gymData['gymInfo']['logo'], true));
            $gymLogo = $gymData['gymInfo']['logo'];
            if (is_array($gymLogo) && !empty($gymLogo['data'])) {
                $gymLogo = $gymLogo['data'];
                $isBase64 = true;
                $logoFound = true;
                error_log('Using gymInfo.logo data (base64)');
            } else {
                $logoFound = true;
                error_log('Using gymInfo.logo as direct URL');
            }
        }
        
        // Check uploads.gym-logo if still not found
        if (!$logoFound && !empty($gymData['uploads']['gym-logo'])) {
            error_log('Found logo in uploads.gym-logo: ' . print_r($gymData['uploads']['gym-logo'], true));
            $gymLogo = $gymData['uploads']['gym-logo'];
            if (is_array($gymLogo) && !empty($gymLogo['data'])) {
                $gymLogo = $gymLogo['data'];
                $isBase64 = true;
                $logoFound = true;
                error_log('Using uploads.gym-logo data (base64)');
            } else {
                $logoFound = true;
                error_log('Using uploads.gym-logo as direct URL');
            }
        }
        
        if (!$logoFound) {
            error_log('No logo found in any expected location');
        }

        // Get gym name with fallbacks
        $gymName = 'GYM NAME';
        if (!empty($gymData['gym_name'])) {
            $gymName = $gymData['gym_name'];
        } elseif (!empty($gymData['gymInfo']['name'])) {
            $gymName = $gymData['gymInfo']['name'];
        } elseif (!empty($gymData['name'])) {
            $gymName = $gymData['name'];
        }

        // Get fitness type with fallbacks
        $fitnessType = 'FITNESS TYPE';
        if (!empty($gymData['gymInfo']['fitnessType'])) {
            $fitnessType = ucfirst($gymData['gymInfo']['fitnessType']);
        } elseif (!empty($gymData['fitness_type'])) {
            $fitnessType = ucfirst($gymData['fitness_type']);
        } elseif (!empty($gymData['type'])) {
            $fitnessType = ucfirst($gymData['type']);
        }

        // Get unread notification count for this gym/user
        $unreadNotifCount = 0;
        try {
            $userId = $_SESSION['user_id'];
            $notifRef = $database->getReference("notifications");
            $allNotifs = $notifRef->getValue() ?: [];
            foreach ($allNotifs as $notif) {
                if (
                    isset($notif['userId']) && $notif['userId'] == $userId &&
                    (empty($notif['status']) || $notif['status'] === 'unread')
                ) {
                    $unreadNotifCount++;
                }
            }
        } catch (Exception $e) {
            $unreadNotifCount = 0;
        }

        // Generate the sidebar HTML
        ob_start();
        ?>
        <style>
.notif-badge {
    background: #ff3333;
    color: #fff;
    border-radius: 50%;
    padding: 2px 8px;
    font-size: 12px;
    font-weight: bold;
    margin-left: 8px;
    vertical-align: middle;
    display: inline-block;
    min-width: 22px;
    text-align: center;
    box-shadow: 0 1px 4px rgba(0,0,0,0.15);
}
</style>
        <div class="sidebar">
            <div class="sidebar-content">
                <?php if (!empty($gymLogo)): ?>
                    <?php if ($isBase64): ?>
                        <?php 
                        // Try to determine the image type
                        $imgData = $gymLogo;
                        $imgType = 'png'; // default
                        
                        // Check for common image signatures
                        if (strpos($imgData, 'data:image/') === 0) {
                            // Data URL format: data:image/type;base64,...
                            $parts = explode(';', $imgData);
                            $typePart = $parts[0];
                            if (preg_match('/data:image\/([a-zA-Z+]+)/', $typePart, $matches)) {
                                $imgType = $matches[1];
                                // Extract just the base64 data
                                $imgData = substr($imgData, strpos($imgData, ',') + 1);
                            }
                        } elseif (strpos($imgData, '/9j/') === 0 || 
                                 strpos($imgData, 'iVBORw0KGgo') === 0 || 
                                 strpos($imgData, 'R0lGOD') === 0) {
                            // Common base64 signatures for JPEG, PNG, GIF
                            if (strpos($imgData, '/9j/') === 0) {
                                $imgType = 'jpeg';
                            } elseif (strpos($imgData, 'iVBORw0KGgo') === 0) {
                                $imgType = 'png';
                            } elseif (strpos($imgData, 'R0lGOD') === 0) {
                                $imgType = 'gif';
                            }
                        }
                        ?>
                        <img src="data:image/<?php echo $imgType; ?>;base64,<?php echo $imgData; ?>" 
                             alt="Gym Logo" 
                             class="gym-logo"
                             onerror="this.onerror=null; this.src='../elements/default-gym-logo.png';">
                    <?php else: ?>
                        <img src="<?php echo htmlspecialchars($gymLogo); ?>" 
                             alt="Gym Logo" 
                             class="gym-logo" 
                             onerror="this.onerror=null; this.src='../elements/default-gym-logo.png';">
                    <?php endif; ?>
                <?php else: ?>
                    <div class="gym-logo-placeholder">
                        <i class="fas fa-camera"></i>
                        <span>No Logo</span>
                    </div>
                <?php endif; ?>

                <h2><?php echo htmlspecialchars($gymName); ?></h2>
                <p class="fitness-type"><?php echo htmlspecialchars($fitnessType); ?></p>

                <nav class="nav-links">
                    <a href="HOME.php" class="nav-link <?php echo $currentPage === 'HOME' ? 'active' : ''; ?>">
                        <i class="fas fa-home"></i> HOME
                    </a>
                    <a href="CALENDAR.php" class="nav-link <?php echo $currentPage === 'CALENDAR' ? 'active' : ''; ?>">
                        <i class="far fa-calendar-alt"></i> CALENDAR
                    </a>
                    <a href="CLASSES.php" class="nav-link <?php echo $currentPage === 'CLASSES' ? 'active' : ''; ?>">
                        <i class="fas fa-dumbbell"></i> CLASSES
                    </a>
                    <a href="GYM.php" class="nav-link <?php echo $currentPage === 'GYM' ? 'active' : ''; ?>">
                        <i class="fas fa-building"></i> YOUR GYM
                    </a>
                    <a href="NOTIFICATION.php" class="nav-link <?php echo $currentPage === 'NOTIFICATION' ? 'active' : ''; ?>">
                        <i class="far fa-bell"></i> NOTIFICATIONS
                        <span class="notif-badge" id="notifBadge" style="display:none;"></span>
                    </a>
                </nav>
            </div>
            
            <div class="logo">
                <img src="../elements/XPASYO - LOGO.png" alt="XPASYO Logo">
            </div>
        </div>
        <?php
        return ob_get_clean();

    } catch (Exception $e) {
        // Log error and return basic sidebar
        error_log('Error generating sidebar: ' . $e->getMessage());
        return '<!-- Error loading sidebar -->';
    }
}
?>

<!-- Firebase SDKs (only ONCE per page, before your badge script) -->
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-database-compat.js"></script>
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
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
const auth = firebase.auth(); // <-- Add this line to define 'auth' globally
const database = firebase.database(); // <-- Add this line to define 'database' globally
</script>

<script>
document.addEventListener('DOMContentLoaded', function() {
    const badge = document.getElementById('notifBadge');
    const userId = "<?php echo isset($_SESSION['user_id']) ? $_SESSION['user_id'] : ''; ?>";
    console.log("Badge script loaded. userId:", userId, "badge:", badge);
    if (!userId) {
        console.log("No userId found for badge.");
        return;
    }
    if (!badge) {
        console.log("No badge element found in DOM.");
        return;
    }
    db.collection('notifications')
      .where('userId', '==', userId)
      .onSnapshot(snapshot => {
        const count = snapshot.size;
        console.log("Badge element:", badge, "Notification count:", count);
        if (count > 0) {
            badge.textContent = count;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
      });
});
</script>
