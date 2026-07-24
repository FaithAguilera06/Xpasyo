<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
// Include the sidebar function
require_once __DIR__ . '/sidebar.php';

// Generate the sidebar with current page highlighted
$sidebar = generateSidebar('NOTIFICATION');

// Get current admin user ID (this will be set by your authentication system)
$adminId = 'admin'; // Replace with actual admin ID from your auth system

// Handle notification actions
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action'])) {
    header('Content-Type: application/json');
    
    try {
        switch ($_POST['action']) {
            case 'mark_as_read':
                if (!isset($_POST['notificationId'])) {
                    throw new Exception('Notification ID is required');
                }
                
                $notificationId = $_POST['notificationId'];
                $firestore->collection('notifications')->document($notificationId)->update([
                    ['path' => 'status', 'value' => 'read'],
                    ['path' => 'updatedAt', 'value' => new \Google\Cloud\Core\Timestamp(new DateTime())]
                ]);
                
                echo json_encode(['success' => true]);
                exit;
                
            case 'process_payment':
                if (!isset($_POST['submissionId']) || !isset($_POST['status'])) {
                    throw new Exception('Submission ID and status are required');
                }
                
                $data = [
                    'action' => 'process_payment',
                    'submissionId' => $_POST['submissionId'],
                    'status' => $_POST['status'],
                    'message' => $_POST['message'] ?? ''
                ];
                
                // Call the payment handler
                $ch = curl_init('http://localhost/XPASYO_DRAFT/pages/payment-handler.php');
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($ch, CURLOPT_POST, true);
                curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
                curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
                
                $response = curl_exec($ch);
                $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                curl_close($ch);
                
                if ($httpCode !== 200) {
                    throw new Exception('Failed to process payment');
                }
                
                $result = json_decode($response, true);
                if (!$result || !$result['success']) {
                    throw new Exception($result['error'] ?? 'Unknown error');
                }
                
                echo json_encode(['success' => true, 'message' => $result['message']]);
                exit;
                
            default:
                throw new Exception('Invalid action');
        }
    } catch (Exception $e) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        exit;
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Notifications</title>
    <link rel="icon" type="image/png" href="../elements/logo web.png">
    <!-- Font Awesome for icons -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
    <!-- jQuery -->
  
  
  <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <style>
        * {
            box-sizing: border-box;
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

        .class-schedule {
            margin-top: 20px;
        }

        .class-schedule table {
            width: 100%;
            border-collapse: collapse;
        }

        .class-schedule th, .class-schedule td {
            padding: 10px;
            text-align: center;
            border: 1px solid #ccc;
        }

        .class-schedule th {
            background-color: black;
            color: white;
        }

        .class-schedule td {
            background-color: white;
        }

        /* Notification Styles */
        .notification-container {
            max-width: 800px;
            margin: 0 auto;
        }
        
        .notification-list {
            margin-top: 20px;
        }
        
        .class-card {
            background-color: #fff;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            padding: 15px;
            margin-bottom: 15px;
            border-left: 4px solid #4CAF50;
            position: relative;
        }
        
        /* Notification Actions */
        .action-buttons {
            display: flex;
            gap: 12px;
            margin-top: 25px;
            flex-wrap: wrap;
        }
        
        .action-buttons button {
            padding: 10px 20px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: all 0.2s;
        }
        
        .action-buttons button i {
            font-size: 14px;
        }
        
        .btn-approve {
            background-color: #4CAF50;
            color: white;
        }
        
        .btn-approve:hover {
            background-color: #3e8e41;
        }
        
        .btn-reject {
            background-color: #f44336;
            color: white;
        }
        
        .btn-reject:hover {
            background-color: #d32f2f;
        }
        
        .btn-delete {
            background-color:  #ffcc00;
            color: black;
        }
        
        .btn-delete:hover {
            background-color: #d32f2f;
        }
        
        .notification-actions {
            padding: 15px 20px;
            background-color: #f8f9fa;
            border-bottom: 1px solid #eee;
        }
        
        .close-modal {
            color: #6c757d;
            position: absolute;
            right: 20px;
            top: 15px;
            font-size: 28px;
            font-weight: bold;
            cursor: pointer;
            background: none;
            border: none;
            padding: 5px 10px;
            transition: color 0.2s;
        }
        
        .close-modal:hover,
        .close-modal:focus {
            color: #333;
            text-decoration: none;
        }
        
        .status-badge {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 0.85em;
            font-weight: 500;
            margin-left: 10px;
        }
        
        .status-badge i {
            font-size: 1.1em;
        }
        
        .status-badge.pending {
            background-color: #fff3cd;
            color: #856404;
        }
        
        .status-badge.paid {
            background-color: #d4edda;
            color: #155724;
        }
        
        .status-badge.rejected {
            background-color: #f8d7da;
            color: #721c24;
        }
        
        .status-badge.deleted {
            background-color: #f1f1f1;
            color: #6c757d;
            text-decoration: line-through;
        }
        
        .status-badge.accepted {
            background-color: #d4edda;
            color: #155724;
        }
        
        .status-badge.declined {
            background-color: #f8d7da;
            color: #721c24;
        }
        
        .class-details {
            padding: 15px 20px;
            border-bottom: 1px solid #eee;
        }
        
        .class-details p {
            margin: 5px 0;
            color: #555;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .class-details i {
            width: 20px;
            color: #666;
            text-align: center;
        }
        
        .notification-message {
            padding: 15px 20px;
            color: #444;
            line-height: 1.5;
        }
        
        .notification-actions {
            padding: 15px 20px;
            background-color: #f8f9fa;
            border-top: 1px solid #eee;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom-left-radius: 8px;
            border-bottom-right-radius: 8px;
        }
        
        .btn-approve, .btn-reject, .btn-confirm-reject, .btn-cancel-reject {
            padding: 8px 15px;
            margin-right: 10px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 500;
            transition: all 0.3s ease;
            display: inline-flex;
            align-items: center;
            gap: 5px;
        }
        
        .btn-approve {
            background-color: #28a745;
            color: white;
        }
        
        .btn-approve:hover {
            background-color: #218838;
        }
        
        .btn-reject {
            background-color: #dc3545;
            color: white;
        }
        
        .btn-reject:hover {
            background-color: #c82333;
        }
        
        .reject-reason {
            margin-top: 15px;
            display: none;
        }
        
        .reject-reason textarea {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            margin-bottom: 10px;
            resize: vertical;
            min-height: 80px;
            font-family: inherit;
        }
        
        .action-buttons {
            display: flex;
            gap: 10px;
            justify-content: flex-end;
        }
        
        .btn-confirm-reject {
            background-color: #dc3545;
            color: white;
        }
        
        .btn-confirm-reject:hover {
            background-color: #c82333;
        }
        
        .btn-cancel-reject {
            background-color: #6c757d;
            color: white;
        }
        
        .btn-cancel-reject:hover {
            background-color: #5a6268;
        }
        
        .btn-view-details {
            color: black;
        }
        
        .btn-view-details:hover {
            background-color: grey;
        }
        
        .btn-view-details i {
            font-size: 14px;
        }
        
        /* Modal Styles */
        .modal {
            display: none;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            overflow: auto;
            background-color: rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(5px);
            justify-content: center;
            align-items: center;
            padding: 20px;
            box-sizing: border-box;
        }
        
        .modal.show {
            display: flex;
        }
        
        .modal-content {
            background-color: white;
            border-radius: 8px;
            width: 90%;
            max-width: 600px;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        
        .modal-header {
            padding: 15px 20px;
            border-bottom: 1px solid #eee;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .modal-header h3 {
            margin: 0;
            font-size: 1.4em;
            color: #333;
        }
        
        .modal-body {
            padding: 20px;
        }
        
        .payment-details {
            margin-bottom: 20px;
        }
        
        .detail-row {
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 1px solid #f0f0f0;
        }
        
        .detail-row:last-child {
            border-bottom: none;
            margin-bottom: 0;
            padding-bottom: 0;
        }
        
        .detail-label {
            font-weight: 600;
            color: #444;
            display: block;
            margin-bottom: 8px;
            font-size: 0.9rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .detail-value {
            color: #222;
            word-break: break-word;
            font-size: 1.05rem;
            line-height: 1.5;
        }
        
        .payment-proof {
            margin-top: 10px;
        }
        
        .payment-proof img {
            max-width: 100%;
            max-height: 300px;
            border-radius: 6px;
            border: 1px solid #eee;
            margin-top: 10px;
        }
        
        .modal-actions {
            margin-top: 25px;
            padding-top: 15px;
            border-top: 1px solid #eee;
        }
        
        .no-notifications {
            text-align: center;
            padding: 30px;
            color: #6c757d;
            padding: 40px 20px;
            font-style: italic;
        }
        
        .error-message {
            background-color: #ffebee;
            color: #c62828;
            padding: 12px 15px;
            border-radius: 4px;
            margin-bottom: 20px;
            border-left: 4px solid #f44336;
        }

        footer {
            background-color: #000;
            color: #FFCC00;
            text-align: center;
            padding: 15px;
            border-top: 6px solid #FFCC00;
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
    </style>
</head>
<body>
    <div class="container">
        <!-- Sidebar -->
        <?php echo $sidebar; ?>

        <!-- Main Content -->
        <div class="main-content">
            <div class="header">
                <h1><span id="h11">YOUR</span> <span id="h12">NOTIFICATION</span></h1>
                <a class="logout-btn" href="INDEX.php">LOG OUT</a>
            </div>
            
            <div class="content-area">
                <?php if (isset($error)): ?>
                    <div class="error-message"><?php echo htmlspecialchars($error); ?></div>
                <?php endif; ?>
                
                <div class="notification-container">
                    <h2>Notifications</h2>
                    <div class="notification-list" id="notificationList">
                        <div id="notificationsList">
                            <!-- Notifications will be loaded here by JavaScript -->
                            <div class="no-notifications">Loading notifications...</div>
                        </div>
                    </div>
                </div>
            </div>

            <footer>
                &copy; 2025 XPASYO. All rights reserved.
            </footer>
        </div>
    </div>

    <!-- Payment Details Modal -->
    <div id="paymentDetailsModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h3>Payment Details</h3>
                <span class="close-modal">&times;</span>
            </div>
            <div class="modal-body">
                <div class="payment-details">
                    <div class="detail-row">
                        <span class="detail-label">Class Name:</span>
                        <span id="detail-class-name" class="detail-value"></span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Coach Name:</span>
                        <span id="detail-coach-name" class="detail-value"></span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Amount:</span>
                        <span id="detail-amount" class="detail-value"></span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Message:</span>
                        <p id="detail-message" class="detail-value"></p>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Payment Proof:</span>
                        <div id="detail-payment-proof" class="payment-proof">
                            <!-- Payment proof image will be inserted here -->
                        </div>
                    </div>
                </div>
                
                <!-- Action Buttons -->
                <div class="modal-actions" id="modalActions">
                    <div class="action-buttons">
                        <button class="btn-approve" id="btnModalApprove">
                            <i class="fas fa-check"></i> Accept
                        </button>
                        <button class="btn-reject" id="btnModalReject">
                            <i class="fas fa-times"></i> Reject
                        </button>
                        <button class="btn-delete" id="btnModalDelete">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                        <div class="reject-reason" id="rejectReasonContainer" style="display: none; margin-top: 15px;">
                            <textarea id="rejectMessage" class="reject-message" placeholder="Reason for rejection (optional)" rows="3"></textarea>
                            <div class="action-buttons" style="margin-top: 10px;">
                                <button class="btn-confirm-reject" id="btnConfirmReject">
                                    <i class="fas fa-paper-plane"></i> Submit Rejection
                                </button>
                                <button class="btn-cancel-reject" id="btnCancelReject">
                                    <i class="fas fa-times"></i> Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>


    
    <script>
        
      
        
        // Enable offline persistence
        firebase.firestore().enablePersistence()
            .catch((err) => {
                if (err.code === 'failed-precondition') {
                    console.warn('Offline persistence can only be enabled in one tab at a time.');
                } else if (err.code === 'unimplemented') {
                    console.warn('The current browser does not support offline persistence.');
                }
            });
        
        // Global variables
        let currentUser = null;
        const adminId = '<?php echo $adminId; ?>'; // Admin user ID from PHP
        
        // Set up auth state change listener
        auth.onAuthStateChanged((user) => {
            currentUser = user;
            loadNotifications();
        });
        
        // Load notifications when the page loads
        document.addEventListener('DOMContentLoaded', () => {
            currentUser = auth.currentUser;
            loadNotifications();
        });
        
        // Load notifications from Firestore with admin and gym filtering
        async function loadNotifications() {
            const notificationsList = document.getElementById('notificationsList');
            if (!notificationsList) {
                console.error('Notifications list element not found');
                return;
            }

            try {
                // Show loading state
                notificationsList.innerHTML = '<div class="no-notifications">Loading notifications...</div>';
                
                // Get current user ID from PHP session
                const currentUserId = '<?php echo isset($_SESSION['user_id']) ? $_SESSION['user_id'] : ''; ?>';
                if (!currentUserId) {
                    notificationsList.innerHTML = '<div class="no-notifications">Please log in to view notifications.</div>';
                    return;
                }
                
                console.log('Fetching admin notifications...');
                
                // Step 1: Get all notifications for admin and process them
                const notificationsSnapshot = await db.collection('notifications')
                    .where('userId', '==', 'admin')
                    .get();
                
                if (notificationsSnapshot.empty) {
                    console.log('No admin notifications found');
                    notificationsList.innerHTML = '<div class="no-notifications">No notifications found.</div>';
                    return;
                }
                
                // Process and filter notifications
                const notifications = [];
                const batch = db.batch();
                const now = new Date();
                
                // Convert to array and filter out deleted notifications
                const validNotifications = [];
                for (const doc of notificationsSnapshot.docs) {
                    const data = doc.data();
                    if (data.data?.status !== 'deleted') {
                        validNotifications.push({
                            id: doc.id,
                            ...data,
                            // Add timestamp for sorting
                            _timestamp: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt?.seconds * 1000) || now
                        });
                    }
                }
                
                // Sort by timestamp (newest first)
                validNotifications.sort((a, b) => b._timestamp - a._timestamp);
                
                if (validNotifications.length === 0) {
                    console.log('No non-deleted admin notifications found');
                    notificationsList.innerHTML = '<div class="no-notifications">No notifications found.</div>';
                    return;
                }
                
                console.log(`Found ${validNotifications.length} non-deleted admin notifications`);
                
                // Process each valid notification
                for (const notification of validNotifications) {
                    if (!notification) continue;
                    
                    // Skip if already processed (shouldn't happen, but just in case)
                    if (notification.data?.status === 'deleted') continue;
                    
                    // Handle different notification types
                    if (notification.type === 'payment' || notification.type === 'paymentUpdate') {
                        // Get classId from notification.data.classId for payment notifications
                        const classId = notification.data?.classId;
                        
                        if (!classId) {
                            console.log('Skipping payment notification - no classId in notification data:', notification.id, notification);
                            continue;
                        }
                        
                        try {
                            // Step 2: Get the coach application document using classId as the document ID
                            const coachAppDoc = await db.collection('coachApplications').doc(classId).get();
                            
                            if (!coachAppDoc.exists) {
                                console.log(`No coach application found with ID: ${classId}`);
                                continue;
                            }
                            
                            const coachAppData = coachAppDoc.data();
                            // Get gymId from the document data
                            const gymId = coachAppData.gymId || (coachAppData.gym && coachAppData.gym.gymId);
                            
                            // Step 3: Check if the gymId matches the current user's ID
                            if (gymId !== currentUserId) {
                                console.log(`Skipping payment notification - gymId (${gymId}) doesn't match current user (${currentUserId})`);
                                continue;
                            }
                            
                            // Process the notification date
                            let createdAt;
                            if (notification.createdAt?.toDate) {
                                createdAt = notification.createdAt.toDate();
                            } else if (notification.createdAt?.seconds) {
                                createdAt = new Date(notification.createdAt.seconds * 1000);
                            } else if (typeof notification.createdAt === 'string') {
                                createdAt = new Date(notification.createdAt);
                            } else {
                                createdAt = new Date();
                            }
                            
                            // Add to notifications array
                            notifications.push({
                                id: notification.id,
                                ...notification,
                                createdAt: createdAt,
                                coachAppData: coachAppData // Include coach app data for reference
                            });
                            
                        } catch (error) {
                            console.error(`Error processing payment notification ${notification.id}:`, error);
                        }
                    } else if (notification.type === 'booking') {
                        // For booking notifications, check gymId directly from notification data
                        const gymId = notification.data?.gymId;
                        
                        if (!gymId) {
                            console.log('Skipping booking notification - no gymId in notification data:', notification.id, notification);
                            continue;
                        }
                        
                        // Check if the gymId matches the current user's ID
                        if (gymId !== currentUserId) {
                            console.log(`Skipping booking notification - gymId (${gymId}) doesn't match current user (${currentUserId})`);
                            continue;
                        }
                        
                        // Process the notification date
                        let createdAt;
                        if (notification.createdAt?.toDate) {
                            createdAt = notification.createdAt.toDate();
                        } else if (notification.createdAt?.seconds) {
                            createdAt = new Date(notification.createdAt.seconds * 1000);
                        } else if (typeof notification.createdAt === 'string') {
                            createdAt = new Date(notification.createdAt);
                        } else {
                            createdAt = new Date();
                        }
                        
                        // Add to notifications array
                        notifications.push({
                            id: notification.id,
                            ...notification,
                            createdAt: createdAt
                        });
                        
                    } else {
                        console.log('Skipping unknown notification type:', notification.type, notification.id);
                    }
                }
                
                // Sort by date (newest first)
                notifications.sort((a, b) => b.createdAt - a.createdAt);
                
                console.log(`Found ${notifications.length} matching notifications`);
                
                // Initialize HTML variable
                let notificationsHTML = '';
                
                // Generate HTML for each notification
                notifications.forEach(notification => {
                    const formattedDate = (() => {
                        if (notification.createdAt) {
                            if (typeof notification.createdAt === 'string') {
                                const dateObj = new Date(notification.createdAt);
                                return dateObj.toLocaleString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                    hour: 'numeric',
                                    minute: '2-digit',
                                    hour12: true
                                });
                            } else if (notification.createdAt.toDate) {
                                return notification.createdAt.toDate().toLocaleString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                    hour: 'numeric',
                                    minute: '2-digit',
                                    hour12: true
                                });
                            } else if (notification.createdAt.seconds) {
                                const dateObj = new Date(notification.createdAt.seconds * 1000);
                                return dateObj.toLocaleString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                    hour: 'numeric',
                                    minute: '2-digit',
                                    hour12: true
                                });
                            }
                        }
                        return '';
                    })();
                    // Fallbacks for className and coachName
                    const className = notification.className || notification.data?.className || 'Unknown Class';
                    const coachName = notification.coachName || notification.data?.coachName || notification.coachAppData?.coachName || 'Unknown Coach';
                    const gymName = notification.coachAppData?.gymName || '';
                    const classDateRaw = notification.data?.classDate || notification.coachAppData?.date || '';
                    const classTimeRaw = notification.data?.classTime || notification.coachAppData?.time || '';
                    const classDate = extractDate(classDateRaw);
                    const classTime = extractTime(classTimeRaw);
                    const hasDateOrTime = !!(classDate || classTime);
                    // --- Payment Notification ---
                    if (notification.type === 'payment' || notification.type === 'paymentUpdate') {
                        const status = notification.data?.status || notification.status || 'pending';
                        const isPending = status === 'pending';
                        // Use latest coach name and date from coachAppData if available
                        let displayCoachName = notification.coachAppData?.coachName || notification.data?.coachName || 'Unknown Coach';
                        let displayClassName = notification.coachAppData?.className || notification.data?.className || className || 'Unknown Class';
                        let displayDate = '';
                        if (notification.coachAppData?.date) {
                            const dateObj = new Date(notification.coachAppData.date);
                            if (!isNaN(dateObj.getTime())) {
                                displayDate = dateObj.getFullYear() + '-' + String(dateObj.getMonth() + 1).padStart(2, '0') + '-' + String(dateObj.getDate()).padStart(2, '0');
                            }
                        } else if (notification.data?.classDate) {
                            displayDate = notification.data.classDate;
                        }
                        // Dynamically generate the message
                        let dynamicMessage = '';
                        if (displayCoachName && displayClassName) {
                            dynamicMessage = `Coach ${escapeHtml(displayCoachName)} has submitted a venue payment for ${escapeHtml(displayClassName)}.`;
                        }
                        notificationsHTML += `
                            <div class="class-card ${isPending ? 'pending' : ''}" data-id="${notification.id}" data-notification-type="payment">
                                <div class="class-header">
                                    <h3>${escapeHtml(displayClassName)}</h3>
                                    <span class="status-badge ${status}">${status.charAt(0).toUpperCase() + status.slice(1)}</span>
                                </div>
                                <div class="class-details">
                                    <p><i class="fas fa-user"></i> ${escapeHtml(displayCoachName)}</p>
                                    ${gymName ? `<p><i class="fas fa-dumbbell"></i> ${escapeHtml(gymName)}</p>` : ''}
                                    ${(displayDate ? `<p><i class='far fa-calendar-alt'></i> ${escapeHtml(displayDate)}</p>` : '')}
                                    ${classTime ? `<p><i class="far fa-clock"></i> ${escapeHtml(classTime)}</p>` : ''}
                                </div>
                                <div class="notification-message">
                                    <p>${dynamicMessage || formatMessage(notification.message || notification.data?.message || 'No message provided.')}</p>
                                </div>
                                <div class="notification-actions" data-notification-id="${notification.id}">
                                    <button class="btn-view-details" data-notification='${JSON.stringify(notification)}'>
                                        <i class="fas fa-eye"></i> View Details
                                    </button>
                                    ${status === 'paid' ? '<span class="status-badge paid"><i class="fas fa-check-circle"></i> Paid</span>' : ''}
                                    ${status === 'rejected' ? '<span class="status-badge rejected"><i class="fas fa-times-circle"></i> Rejected</span>' : ''}
                                    ${status === 'pending' ? '<span class="status-badge pending"><i class="fas fa-clock"></i> Pending</span>' : ''}
                                    ${isPending ? `
                                        <button class="btn-approve" data-notification-id="${notification.id}" data-class-id="${notification.data?.classId}">
                                            <i class="fas fa-check"></i> Approve
                                        </button>
                                        <button class="btn-reject" data-notification-id="${notification.id}">
                                            <i class="fas fa-times"></i> Reject
                                        </button>
                                        <div class="reject-reason" style="display: none;">
                                            <textarea class="reject-message" placeholder="Reason for rejection"></textarea>
                                            <button class="btn-confirm-reject" data-notification-id="${notification.id}" data-class-id="${notification.data?.classId}">Confirm Reject</button>
                                            <button class="btn-cancel-reject">Cancel</button>
                                        </div>
                                    ` : ''}
                                    <button class="btn-delete" data-notification-id="${notification.id}" data-class-id="${notification.data?.classId}">
                                        <i class="fas fa-trash"></i> Delete
                                    </button>
                                </div>
                            </div>
                        `;
                    }
                    // --- Booking Notification ---
                    else if (notification.type === 'booking') {
                        const bookingCoachName = notification.data?.coachName || 'Unknown Coach';
                        const bookingGymName = notification.data?.gymName || 'Unknown Gym';
                        const bookingDateRaw = notification.data?.date || '';
                        const bookingTimeRaw = notification.data?.time || '';
                        const bookingDate = extractDate(bookingDateRaw);
                        const bookingTime = extractTime(bookingTimeRaw);
                        const message = notification.data?.message || notification.message || notification.title || '';

                        // Try to extract the full date string from the message if present
                        let messageDate = '';
                        const fullDateMatch = message.match(/on ([A-Za-z]{3,9} [A-Za-z]{3,9} \d{1,2} \d{4} [0-9:]+ GMT[+-][0-9]{4})/);
                        if (fullDateMatch && fullDateMatch[1]) {
                            messageDate = fullDateMatch[1];
                        } else {
                            // Try to extract just the short date if full not found
                            const dateMatch = message.match(/on ([A-Za-z]{3,9} \d{1,2} \d{4})/);
                            if (dateMatch && dateMatch[1]) {
                                messageDate = dateMatch[1];
                            }
                        }

                        notificationsHTML += `
                            <div class="class-card" data-id="${notification.id}" data-notification-type="booking">
                                <div class="class-header">
                                    <h3>${escapeHtml(className)}</h3>
                                </div>
                                <div class="class-details">
                                    <p><i class="fas fa-user"></i> ${escapeHtml(bookingCoachName)}</p>
                                    <p><i class="fas fa-dumbbell"></i> ${escapeHtml(bookingGymName)}</p>
                                    ${(messageDate ? `<p><i class='far fa-calendar-alt'></i> ${escapeHtml(messageDate)}</p>` : (bookingDate ? `<p><i class='far fa-calendar-alt'></i> ${escapeHtml(bookingDate)}</p>` : ''))}
                                    ${bookingTime ? `<p><i class="far fa-clock"></i> ${escapeHtml(bookingTime)}</p>` : ''}
                                </div>
                                <div class="notification-message">
                                    <p>Coach <strong>${escapeHtml(bookingCoachName)}</strong> booked your gym.<br>${formatMessage(message)}</p>
                                </div>
                                <div class="notification-actions" data-notification-id="${notification.id}">
                                    <button class="btn-delete" data-notification-id="${notification.id}">
                                        <i class="fas fa-trash"></i> Delete
                                    </button>
                                </div>
                            </div>
                        `;
                    }
                });
                
                // Update the DOM once with all notifications
                notificationsList.innerHTML = notificationsHTML || '<div class="no-notifications">No notifications found.</div>';
                
                // Event listeners are already set up with delegation
                // No need to call initializeEventListeners()
                
            } catch (error) {
                console.error('Error loading notifications:', error);
                
                let errorMessage = 'An error occurred while loading notifications.';
                if (error.code === 'permission-denied') {
                    errorMessage = 'You do not have permission to view notifications. Please ensure you are logged in.';
                } else if (error.code === 'unavailable') {
                    errorMessage = 'Unable to connect to the server. Please check your internet connection.';
                }
                
                notificationsList.innerHTML = `
                    <div class="error-message">
                        <p>${errorMessage}</p>
                        <p><small>Error: ${error.message || 'Unknown error'}</small></p>
                    </div>`;
            }
        }
        
        // Helper function to escape HTML
        function escapeHtml(unsafe) {
            return unsafe
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        }
        
        // Helper function to format message with line breaks
        function formatMessage(message) {
            return escapeHtml(message || '').replace(/\n/g, '<br>');
        }
        
        // Helper to format ISO date/time strings
        function formatDateTime(dateStr) {
  if (!dateStr) return '';
  // If it's a Firestore Timestamp, return as is
  if (typeof dateStr !== 'string') return dateStr;
  // If it looks like '2025-08-25T04:46:00.000Z'
  const match = dateStr.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}):\d{2}(.\d+)?Z?$/);
  if (match) {
    // Format date
    const date = match[1];
    // Format time to 12-hour with AM/PM
    let [hour, minute] = match[2].split(':');
    let h = parseInt(hour, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    if (h === 0) h = 12;
    return date + ' ' + h + ':' + minute + ' ' + ampm;
  }
  return dateStr;
}
        
        // Helper to extract just the date (YYYY-MM-DD)
        function extractDate(dateStr) {
  if (!dateStr) return '';
  if (typeof dateStr !== 'string') return dateStr;
  const match = dateStr.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : dateStr;
}
        // Helper to extract just the time (HH:MM AM/PM)
        function extractTime(timeStr) {
  if (!timeStr) return '';
  if (typeof timeStr !== 'string') return timeStr;
  // Handle time ranges like "19:00-20:00"
  if (timeStr.includes('-')) {
    const [start, end] = timeStr.split('-').map(s => s.trim());
    return `${formatSingleTime(start)} - ${formatSingleTime(end)}`;
  }
  return formatSingleTime(timeStr);
}
function formatSingleTime(t) {
  if (!t) return '';
  // If already in 12-hour format with AM/PM, return as is
  if (t.match(/^(0?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i)) {
    return t.toUpperCase();
  }
  // If ISO string
  const match = t.match(/T(\d{2}):(\d{2})/);
  let hour, minute;
  if (match) {
    hour = parseInt(match[1], 10);
    minute = match[2];
  } else if (t.match(/^([01]?\d|2[0-3]):([0-5]\d)$/)) {
    [hour, minute] = t.split(':');
    hour = parseInt(hour, 10);
  } else {
    return t;
  }
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12;
  if (hour === 0) hour = 12;
  // Pad hour and minute for consistency
  return `${hour.toString().padStart(2, '0')}:${minute} ${ampm}`;
}
        
        // Single delegated event handler for all notification actions
        $(document).off('click', '.notification-item, .btn-approve, .btn-reject, .btn-confirm-reject, .btn-cancel-reject, .btn-delete, .btn-view-details')
        .on('click', '.notification-item', function(e) {
            if (!$(e.target).closest('.notification-actions').length) {
                const notificationId = $(this).data('id');
                markAsRead(notificationId, $(this));
            }
        })
        .on('click', '.btn-approve', async function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const btn = $(this);
            const notificationId = btn.data('notification-id');
            const bookingType = btn.data('booking-type');
            
            if (notificationId) {
                btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin"></i> Processing...');
                try {
                    if (bookingType === 'booking') {
                        await updateBookingStatus(notificationId, 'accepted');
                    } else {
                    await updatePaymentStatus(notificationId, 'paid');
                    }
                    // Update UI immediately
                    const card = btn.closest('.class-card');
                    card.find('.btn-approve, .btn-reject, .btn-delete').hide();
                    const statusBadge = card.find('.status-badge');
                    if (bookingType === 'booking') {
                        statusBadge.attr('class', 'status-badge accepted')
                            .html('<i class="fas fa-check-circle"></i> Accepted');
                    } else {
                    statusBadge.attr('class', 'status-badge paid')
                        .html('<i class="fas fa-check-circle"></i> Paid');
                    }
                } catch (error) {
                    console.error('Error approving:', error);
                    alert('Failed to approve. Please try again.');
                } finally {
                    btn.prop('disabled', false).html('<i class="fas fa-check"></i> Accept');
                }
            }
        })
        .on('click', '.btn-reject', function(e) {
            e.preventDefault();
            e.stopPropagation();
            $(this).next('.reject-reason').show();
        })
        .on('click', '.btn-confirm-reject', async function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const btn = $(this);
            const container = btn.closest('.notification-actions');
            const notificationId = container.find('.btn-approve').data('notification-id');
            const bookingType = container.find('.btn-approve').data('booking-type');
            const message = container.find('.reject-message').val() || 'No reason provided';
            
            if (notificationId) {
                btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin"></i> Processing...');
                try {
                    if (bookingType === 'booking') {
                        await updateBookingStatus(notificationId, 'declined', message);
                    } else {
                    await updatePaymentStatus(notificationId, 'rejected', message);
                    }
                    // Update UI immediately
                    const card = btn.closest('.class-card');
                    card.find('.btn-approve, .btn-reject, .btn-delete, .reject-reason').hide();
                    const statusBadge = card.find('.status-badge');
                    if (bookingType === 'booking') {
                        statusBadge.attr('class', 'status-badge declined')
                            .html('<i class="fas fa-times-circle"></i> Declined');
                    } else {
                    statusBadge.attr('class', 'status-badge rejected')
                        .html('<i class="fas fa-times-circle"></i> Rejected');
                    }
                } catch (error) {
                    console.error('Error rejecting:', error);
                    alert('Failed to reject. Please try again.');
                } finally {
                    btn.prop('disabled', false).text('Confirm Reject');
                }
            }
        })
        .on('click', '.btn-cancel-reject', function(e) {
            e.preventDefault();
            e.stopPropagation();
            $(this).closest('.reject-reason').hide();
        })
        .on('click', '.btn-delete', async function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const btn = $(this);
            const notificationId = btn.data('notification-id');
            const card = btn.closest('.class-card');
            
            // Determine notification type from the data attribute
            const notificationType = card.data('notification-type');
            const isBookingNotification = notificationType === 'booking';
            
            const confirmMessage = isBookingNotification 
                ? 'Are you sure you want to delete this booking notification? This action cannot be undone.'
                : 'Are you sure you want to delete this payment record? This action cannot be undone.';
            
            if (!confirm(confirmMessage)) {
                return;
            }
            
            if (notificationId) {
                btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin"></i> Deleting...');
                try {
                    if (isBookingNotification) {
                        // Delete booking notification
                        await deleteBookingNotification(notificationId);
                    } else {
                        // Delete payment notification
                        await updatePaymentStatus(notificationId, 'deleted');
                    }
                    
                    // Remove the notification card with animation
                    card.fadeOut(300, function() {
                        $(this).remove();
                        // Check if no notifications left
                        if ($('.class-card').length === 0) {
                            $('#notificationsList').html('<div class="no-notifications">No notifications found.</div>');
                        }
                    });
                } catch (error) {
                    console.error('Error deleting notification:', error);
                    alert('Failed to delete notification. Please try again.');
                    btn.prop('disabled', false).html('<i class="fas fa-trash"></i> Delete');
                }
            }
        })
        .on('click', '.btn-view-details', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const notification = $(this).data('notification');
            if (notification) {
                showNotificationDetails(notification);
            }
        });
        
        // Mark notification as read
        async function markAsRead(notificationId, element) {
            if (element.hasClass('unread')) {
                try {
                    await db.collection('notifications').doc(notificationId).update({
                        status: 'read',
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    element.removeClass('unread');
                } catch (error) {
                    console.error('Error marking notification as read:', error);
                }
            }
        }
        
        // Show notification details in a modal
        function showNotificationDetails(notification) {
            // Create modal HTML if it doesn't exist
            let modal = document.getElementById('notification-details-modal');
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'notification-details-modal';
                modal.className = 'modal';
                modal.innerHTML = `
                    <div class="modal-content">
                        <span class="close-modal">&times;</span>
                        <div class="modal-header">
                            <h3>Payment Details</h3>
                        </div>
                        <div class="modal-body">
                            <div id="notification-details-content"></div>
                        </div>
                    </div>
                `;
                document.body.appendChild(modal);
                
                // Add close button handler
                modal.querySelector('.close-modal').addEventListener('click', () => {
                    modal.style.display = 'none';
                });
                
                // Close when clicking outside the modal
                window.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        modal.style.display = 'none';
                    }
                });
            }
            
            // Format the notification data for display
            const details = `
                <div class="notification-details">
                    <p><strong>Class:</strong> ${notification.coachAppData?.className || 'N/A'}</p>
                    <p><strong>Coach:</strong> ${notification.coachAppData?.coachName || 'N/A'}</p>
                    <p><strong>Date:</strong> ${new Date(notification.createdAt?.seconds * 1000).toLocaleString()}</p>
                    <p><strong>Status:</strong> ${notification.data?.status || 'pending'}</p>
                    ${notification.data?.amount ? `<p><strong>Amount:</strong> ${notification.data.amount}</p>` : ''}
                    ${notification.data?.receiptUrl ? `
                        <div class="receipt-preview">
                            <p><strong>Receipt:</strong></p>
                            <img src="${notification.data.receiptUrl}" alt="Payment receipt" style="max-width: 100%; max-height: 300px; margin-top: 10px;">
                        </div>` : ''
                    }
                    ${notification.data?.adminMessage ? `<p><strong>Admin Note:</strong> ${notification.data.adminMessage}</p>` : ''}
                </div>
            `;
            
            // Update modal content and show
            document.getElementById('notification-details-content').innerHTML = details;
            modal.style.display = 'block';
        }
        
        // Update payment status using notification ID
        async function updatePaymentStatus(notificationId, status, message = '') {
            try {
                if (!notificationId) {
                    throw new Error('Notification ID is required');
                }
                
                // Get the notification document
                const notificationRef = db.collection('notifications').doc(notificationId);
                const notificationDoc = await notificationRef.get();
                
                if (!notificationDoc.exists) {
                    throw new Error('Notification not found');
                }
                
                const notificationData = notificationDoc.data();
                const classId = notificationData.data?.classId;
                
                if (!classId) {
                    throw new Error('Class ID not found in notification');
                }
                
                // Get the class document
                const classRef = db.collection('coachApplications').doc(classId);
                const classDoc = await classRef.get();
                
                if (!classDoc.exists) {
                    throw new Error(`Class not found: ${classId}`);
                }
                
                const classData = classDoc.data();
                const className = classData.className || 'the class';
                const coachId = classData.coachId || classData.userId;
                
                // Create a batch for atomic updates
                const batch = db.batch();
                
                // Update the class document
                const updateData = {
                    paymentStatus: status,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                };
                
                // Only add adminMessage if it exists and we're not deleting
                if (message && status !== 'deleted') {
                    updateData.adminMessage = message;
                }
                
                batch.update(classRef, updateData);
                
                // For delete, we'll actually delete the document
                if (status === 'deleted') {
                    batch.delete(notificationRef);
                } else {
                    // Update notification status for non-delete actions
                    const notificationUpdate = {
                        'data.status': status,
                        status: 'read',
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    };
                    
                    // Add admin message to notification if rejecting
                    if (status === 'rejected' && message) {
                        notificationUpdate['data.adminMessage'] = message;
                    }
                    
                    batch.update(notificationRef, notificationUpdate);
                }
                
                // Commit the batch
                await batch.commit();
                
                // Only send notification if not deleting (we'll handle deletion UI separately)
                if (status !== 'deleted' && coachId) {
                    const statusText = status.charAt(0).toUpperCase() + status.slice(1);
                    let notificationMessage = '';
                    
                    switch(status) {
                        case 'paid':
                            notificationMessage = `Your payment for ${className} has been approved.`;
                            break;
                        case 'rejected':
                            notificationMessage = `Your payment for ${className} was rejected.`;
                            if (message) {
                                notificationMessage += ` Reason: ${message}`;
                            }
                            break;
                        default:
                            notificationMessage = `The status of your payment for ${className} has been updated to ${status}.`;
                    }
                    
                    // Send notification to coach
                    await db.collection('notifications').add({
                        title: `Payment ${statusText}`,
                        message: notificationMessage,
                        type: 'payment_update',
                        userId: coachId,
                        data: {
                            classId: classId,
                            className: className,
                            status: status,
                            ...(message && { adminMessage: message })
                        },
                        status: 'unread',
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    
                    console.log(`Notification sent to coach ${coachId} for ${status} payment`);
                }
                
                return true;
                
            } catch (error) {
                console.error('Error updating payment status:', error);
                throw error; // Re-throw to allow caller to handle the error
            }
        }
        
        // Delete booking notification
        async function deleteBookingNotification(notificationId) {
            try {
                if (!notificationId) {
                    throw new Error('Notification ID is required');
                }
                
                // Get the notification document
                const notificationRef = db.collection('notifications').doc(notificationId);
                const notificationDoc = await notificationRef.get();
                
                if (!notificationDoc.exists) {
                    throw new Error('Notification not found');
                }
                
                const notificationData = notificationDoc.data();
                
                // Check if this is a booking notification
                if (notificationData.type !== 'booking') {
                    throw new Error('This function is only for booking notifications');
                }
                
                // Delete the notification document
                await notificationRef.delete();
                
                console.log(`Booking notification ${notificationId} deleted successfully`);
                return true;
                
            } catch (error) {
                console.error('Error deleting booking notification:', error);
                throw error; // Re-throw to allow caller to handle the error
            }
        }
        
        // Update booking status (accept/decline)
        async function updateBookingStatus(notificationId, status, message = '') {
            try {
                if (!notificationId) {
                    throw new Error('Notification ID is required');
                }
                
                // Get the notification document
                const notificationRef = db.collection('notifications').doc(notificationId);
                const notificationDoc = await notificationRef.get();
                
                if (!notificationDoc.exists) {
                    throw new Error('Notification not found');
                }
                
                const notificationData = notificationDoc.data();
                
                // Check if this is a booking notification
                if (notificationData.type !== 'booking') {
                    throw new Error('This function is only for booking notifications');
                }
                
                const coachId = notificationData.data?.coachId || notificationData.coachId;
                const className = notificationData.data?.className || notificationData.className || 'the class';
                const gymId = notificationData.data?.gymId;
                const bookingData = notificationData.data;
                
                // Create a batch for atomic updates
                const batch = db.batch();
                
                // Update notification status
                const notificationUpdate = {
                    'data.status': status,
                    status: 'read',
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                };
                
                // Add admin message to notification if declining
                if (status === 'declined' && message) {
                    notificationUpdate['data.adminMessage'] = message;
                }
                
                batch.update(notificationRef, notificationUpdate);
                
                // If accepted, create a coach application document
                if (status === 'accepted' && bookingData) {
    // Use a composite key or unique identifier for the class
    const compositeKey = `${bookingData.gymId}_${bookingData.className}_${bookingData.day}_${bookingData.time}`;
    // Query for existing application with this compositeKey
    const existingQuery = await db.collection('coachApplications')
        .where('compositeKey', '==', compositeKey)
        .where('coachId', '==', coachId)
        .get();

    if (existingQuery.empty) {
        // No duplicate, safe to create
        const coachApplicationData = {
            className: bookingData.className || className,
            coachName: bookingData.coachName || 'Unknown Coach',
            coachId: coachId,
            gymId: gymId,
            gymName: bookingData.gymName || '',
            date: bookingData.date || '',
            day: bookingData.day || '',
            time: bookingData.time || '',
            status: 'pending', // or 'accepted'
            paymentStatus: 'unpaid',
            appliedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            compositeKey: compositeKey,
            // ...any other booking data that should be preserved
            ...bookingData
        };
        // Add to coachApplications collection
        const coachAppRef = db.collection('coachApplications').doc();
        batch.set(coachAppRef, coachApplicationData);
        console.log('Created coach application for accepted booking:', coachAppRef.id);
    } else {
        // Already exists, do not create duplicate
        console.log('Coach application already exists for this class, skipping creation.');
    }
}
                
                // Commit the batch
                await batch.commit();
                
                // Send notification to coach
                if (coachId) {
                    const statusText = status.charAt(0).toUpperCase() + status.slice(1);
                    let notificationMessage = '';
                    
                    switch(status) {
                        case 'accepted':
                            notificationMessage = `Your booking for ${className} has been accepted by the gym.`;
                            break;
                        case 'declined':
                            notificationMessage = `Your booking for ${className} was declined by the gym.`;
                            if (message) {
                                notificationMessage += ` Reason: ${message}`;
                            }
                            break;
                        default:
                            notificationMessage = `The status of your booking for ${className} has been updated to ${status}.`;
                    }
                    
                    // Send notification to coach
                    await db.collection('notifications').add({
                        title: `Booking ${statusText}`,
                        message: notificationMessage,
                        type: 'booking_update',
                        userId: coachId,
                        data: {
                            className: className,
                            status: status,
                            gymId: gymId,
                            ...(message && { adminMessage: message })
                        },
                        status: 'unread',
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    
                    console.log(`Notification sent to coach ${coachId} for ${status} booking`);
                }
                
                return true;
                
            } catch (error) {
                console.error('Error updating booking status:', error);
                throw error; // Re-throw to allow caller to handle the error
            }
        }
        
        // Get modal elements
        const modal = document.getElementById('paymentDetailsModal');
        const modalActions = document.getElementById('modalActions');
        const closeModal = document.querySelector('.close-modal');
        let currentNotification = null;

        // Function to open payment modal
        function openPaymentModal(notification) {
            if (!notification) return;
            
            console.log('Opening modal for notification:', notification);
            
            // Set the notification data in the modal
            const classData = notification.coachAppData || {};
            const notificationData = notification.data || {};
            
            // Set the modal content
            const className = classData.className || notificationData.className || 'N/A';
            const coachName = classData.coachName || notificationData.coachName || 'N/A';
            const amount = notificationData.amount ? `₱${parseFloat(notificationData.amount).toFixed(2)}` : 'N/A';
            const message = notification.message || notificationData.message || 'No message provided.';
            
            console.log('Setting modal content:', { className, coachName, amount, message });
            
            // Update modal fields
            const detailClassName = document.getElementById('detail-class-name');
            const detailCoachName = document.getElementById('detail-coach-name');
            const detailAmount = document.getElementById('detail-amount');
            const detailMessage = document.getElementById('detail-message');
            const paymentProof = document.getElementById('detail-payment-proof');
            
            if (detailClassName) detailClassName.textContent = className;
            if (detailCoachName) detailCoachName.textContent = coachName;
            if (detailAmount) detailAmount.textContent = amount;
            if (detailMessage) detailMessage.textContent = message;
            
            // Handle payment proof image
            if (paymentProof) {
                paymentProof.innerHTML = ''; // Clear previous image
                if (notificationData.paymentProof) {
                    const img = document.createElement('img');
                    img.src = notificationData.paymentProof;
                    img.alt = 'Payment Proof';
                    img.loading = 'lazy';
                    img.style.maxWidth = '100%';
                    img.style.maxHeight = '300px';
                    paymentProof.appendChild(img);
                } else {
                    paymentProof.textContent = 'No payment proof provided.';
                }
            }
            
            // Show/hide action buttons based on status
            const isPending = notificationData.status === 'pending';
            if (modalActions) {
                modalActions.style.display = isPending ? 'block' : 'none';
            }
            
            // Show the modal
            if (modal) {
                modal.style.display = 'flex';
                document.body.style.overflow = 'hidden';
            }
        }
        
        // Function to close payment modal
        function closePaymentModal() {
            if (modal) {
                modal.style.display = 'none';
                document.body.style.overflow = 'auto';
                
                // Reset reject reason container
                const rejectContainer = document.getElementById('rejectReasonContainer');
                const rejectMessage = document.getElementById('rejectMessage');
                
                if (rejectContainer) rejectContainer.style.display = 'none';
                if (rejectMessage) rejectMessage.value = '';
                
                currentNotification = null;
            }
        }
        
        // Single delegated event handler for view details button
        $(document).off('click', '.btn-view-details') // Remove any existing handlers first
            .on('click', '.btn-view-details', function(e) {
                e.preventDefault();
                e.stopImmediatePropagation();
                
                const button = $(this);
                const notificationData = button.data('notification');
                
                try {
                    // Close any open modals first
                    if (modal && modal.style.display === 'flex') {
                        closePaymentModal();
                        return; // Exit and let the next click handle opening
                    }
                    
                    // Parse the notification data if it's a string
                    currentNotification = typeof notificationData === 'string' 
                        ? JSON.parse(notificationData) 
                        : notificationData;
                    
                    console.log('Opening modal with notification:', currentNotification);
                    
                    // Ensure we have valid data
                    if (!currentNotification) {
                        throw new Error('No notification data available');
                    }
                    
                    // Open the modal with a small delay to ensure the click event is fully processed
                    setTimeout(() => {
                        openPaymentModal(currentNotification);
                    }, 50);
                    
                } catch (error) {
                    console.error('Error handling view details:', error);
                    alert('Error loading notification details. Please try again.');
                }
                
                return false;
            });

        // Close modal when clicking the X - using direct event listener
        const closeModalBtn = document.querySelector('.close-modal');
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                closePaymentModal();
                return false;
            });
        }
        
        // Close when clicking outside the modal content
        document.addEventListener('click', function(e) {
            if (e.target === modal) {
                closePaymentModal();
                return false;
            }
        });
        
        // Close with Escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && modal && modal.style.display === 'flex') {
                closePaymentModal();
                return false;
            }
        });

        // Modal action buttons
        document.getElementById('btnModalApprove').addEventListener('click', async () => {
            if (currentNotification) {
                console.log('Approving payment with notification:', currentNotification);
                console.log('Notification data:', currentNotification.data);
                console.log('Coach app data:', currentNotification.coachAppData);
                
                const submissionId = currentNotification.id || currentNotification.data?.submissionId;
                const classId = currentNotification.coachAppData?.id || currentNotification.data?.classId;
                
                console.log('Using submissionId:', submissionId);
                console.log('Using classId:', classId);
                
                if (!submissionId || !classId) {
                    console.error('Missing submissionId or classId in notification:', currentNotification);
                    alert('Error: Missing required data. Please try again.');
                    return;
                }
                
                await updatePaymentStatus(
                    submissionId,
                    classId,
                    'paid'
                );
                closePaymentModal();
            }
        });

        document.getElementById('btnModalReject').addEventListener('click', () => {
            document.getElementById('rejectReasonContainer').style.display = 'block';
        });

        document.getElementById('btnConfirmReject').addEventListener('click', async () => {
            if (currentNotification) {
                console.log('Rejecting payment with notification:', currentNotification);
                console.log('Notification data:', currentNotification.data);
                console.log('Coach app data:', currentNotification.coachAppData);
                
                const submissionId = currentNotification.id || currentNotification.data?.submissionId;
                const classId = currentNotification.coachAppData?.id || currentNotification.data?.classId;
                
                console.log('Using submissionId (reject):', submissionId);
                console.log('Using classId (reject):', classId);
                const message = document.getElementById('rejectMessage').value;
                
                if (!submissionId || !classId) {
                    console.error('Missing submissionId or classId in notification:', currentNotification);
                    alert('Error: Missing required data. Please try again.');
                    return;
                }
                
                await updatePaymentStatus(
                    submissionId,
                    classId,
                    'rejected',
                    message
                );
                closePaymentModal();
            }
        });

        document.getElementById('btnCancelReject').addEventListener('click', () => {
            document.getElementById('rejectReasonContainer').style.display = 'none';
            document.getElementById('rejectMessage').value = '';
        });

        document.getElementById('btnModalDelete').addEventListener('click', async () => {
            if (confirm('Are you sure you want to delete this payment record? This action cannot be undone.') && currentNotification) {
                console.log('Deleting payment with notification:', currentNotification);
                console.log('Notification data:', currentNotification.data);
                console.log('Coach app data:', currentNotification.coachAppData);
                
                const submissionId = currentNotification.id || currentNotification.data?.submissionId;
                const classId = currentNotification.coachAppData?.id || currentNotification.data?.classId;
                
                console.log('Using submissionId (delete):', submissionId);
                console.log('Using classId (delete):', classId);
                
                if (!submissionId || !classId) {
                    console.error('Missing submissionId or classId in notification:', currentNotification);
                    alert('Error: Missing required data. Please try again.');
                    return;
                }
                
                await updatePaymentStatus(
                    submissionId,
                    classId,
                    'deleted'
                );
                closePaymentModal();
            }
        });

        function openPaymentModal(notification) {
            console.log('Opening modal with notification:', notification);
            
            // Set the notification data in the modal
            const classData = notification.coachAppData || {};
            const notificationData = notification.data || {};
            
            // Debug log
            console.log('Class data:', classData);
            console.log('Notification data:', notificationData);
            
            // Set the modal content
            document.getElementById('detail-class-name').textContent = classData.className || notificationData.className || 'N/A';
            document.getElementById('detail-coach-name').textContent = classData.coachName || notificationData.coachName || 'N/A';
            document.getElementById('detail-amount').textContent = notificationData.amount ? `₱${parseFloat(notificationData.amount).toFixed(2)}` : 'N/A';
            document.getElementById('detail-message').textContent = notification.message || notificationData.message || 'No message provided.';
            
            // Handle payment proof image
            const paymentProofContainer = document.getElementById('detail-payment-proof');
            paymentProofContainer.innerHTML = ''; // Clear previous image
            
            if (notification.data?.paymentProof) {
                const img = document.createElement('img');
                img.src = notification.data.paymentProof;
                img.alt = 'Payment Proof';
                img.loading = 'lazy';
                paymentProofContainer.appendChild(img);
            } else {
                paymentProofContainer.textContent = 'No payment proof provided.';
            }
            
            // Show/hide action buttons based on status
            const isPending = notification.data?.status === 'pending';
            modalActions.style.display = isPending ? 'block' : 'none';
            
            // Show the modal
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }

        function closePaymentModal() {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
            document.getElementById('rejectReasonContainer').style.display = 'none';
            document.getElementById('rejectMessage').value = '';
            currentNotification = null;
        }
    </script>
</body>
</html>
