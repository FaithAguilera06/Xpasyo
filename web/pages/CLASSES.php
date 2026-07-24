<?php
// Include the sidebar function and Firebase config
require_once __DIR__ . '/sidebar.php';
require_once __DIR__ . '/firebase_config.php';

// Generate the sidebar with current page highlighted
$sidebar = generateSidebar('CLASSES');

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Get gym ID from session or user data
$gymId = null;

// Try different ways to get gym ID
if (isset($_SESSION['gymId'])) {
    $gymId = $_SESSION['gymId'];
} elseif (isset($_SESSION['gym_data']['gymId'])) {
    $gymId = $_SESSION['gym_data']['gymId'];
} elseif (isset($_SESSION['user_id'])) {
    $gymId = $_SESSION['user_id'];
}

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" />
    <link rel="icon" type="image/png" href="../elements/logo web.png">


    <title>Your CLASSES</title>

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

        .class-filter {
            margin-bottom: 20px;
        }

        .class-filter button {
            background-color: #f0f0f0;
            border: 2px solid #FFD700;
            border-radius: 20px;
            padding: 8px 20px;
            margin-right: 10px;
            margin-bottom: 10px;
            cursor: pointer;
            font-weight: bold;
            color: #333;
            transition: all 0.3s ease;
        }
        
        .class-filter button:hover {
            background-color: #FFD700;
            color: #000;
        }
        
        .class-filter button.active {
            background-color: #FFD700;
            color: #000;
            border-color: #FFD700;
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
            background-color: rgba(0, 0, 0, 0.7);
            overflow-y: auto;
        }

        .modal-content {
            background-color: #1a1a1a;
            margin: 5% auto;
            padding: 25px;
            border-radius: 8px;
            width: 90%;
            max-width: 700px;
            color: #fff;
            position: relative;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        }

        .close-modal {
            position: absolute;
            right: 25px;
            top: 15px;
            font-size: 28px;
            font-weight: bold;
            color: #aaa;
            cursor: pointer;
        }

        .close-modal:hover {
            color: #fff;
        }

        .attendees-list {
            margin-top: 20px;
            background: #2a2a2a;
            padding: 15px;
            border-radius: 6px;
        }

        .attendee-item {
            display: flex;
            justify-content: space-between;
            padding: 10px;
            border-bottom: 1px solid #444;
            align-items: center;
        }

        .attendee-item:last-child {
            border-bottom: none;
        }

        .attendee-info {
            flex: 1;
        }

        .payment-status {
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 0.85em;
            font-weight: 600;
        }

        .paid {
            background-color: #2e7d32;
            color: #b9f6ca;
        }

        .unpaid {
            background-color: #c62828;
            color: #ffcdd2;
        }

        .class-list {
            margin-top: 20px;
            max-width: 800px;
            margin: 20px auto;
            padding: 0 20px;
            display: flex;
            flex-direction: column;
            gap: 15px;
        }

        .class-item {
            background-color: #2C2C2E;
            border-radius: 12px;
            padding: 15px 20px;
            display: flex;
            align-items: center;
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
            color: #FFFFFF;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        
        .class-item:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 12px rgba(0,0,0,0.25);
        }

        .class-time {
            display: flex;
            flex-direction: column;
            align-items: center;
            min-width: 80px;
            margin-right: 20px;
        }
        
        .time {
            font-size: 24px;
            font-weight: 700;
            color: #FFD700; /* Changed to yellow */
            line-height: 1.2;
        }
        
        .date {
            font-size: 14px;
            color: #A0A0A0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .class-details {
            flex: 1;
            padding: 20px 25px;
            display: flex;
            flex-direction: column;
            justify-content: center;
        }
        
        .class-name {
            font-size: 1.3rem;
            font-weight: 600;
            color: #1a1a1a;
            margin: 0 0 8px 0;
        }
        
        .class-info {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }
        
        .class-name {
            font-size: 18px;
            font-weight: 600;
            color: #FFFFFF;
        }
        
        .class-coach {
            font-size: 14px;
            color: #A0A0A0;
        }
        
        .class-type {
            font-size: 16px;
            color: #FFFFFF;
            font-weight: 500;
        }
        
        .class-coach {
            font-size: 16px;
            color: #FFFFFF;
            font-weight: 500;
        }
        
        .class-stats {
            display: flex;
            gap: 15px;
            font-size: 14px;
            color: #A0A0A0;
        }
        
        .class-students::before {
            content: '👥 ';
            opacity: 0.7;
        }
        
        .class-fee {
            color: #FFD700; /* Changed to yellow */
            font-weight: 600;
        }
        
        .class-fee::before {
            content: '₱';
        }
        
        /* Filter Section */
        .filter-section {
            background: #1C1C1E;
            padding: 15px 20px;
            border-radius: 12px;
            margin: 20px auto;
            max-width: 800px;
        }
        
        .filter-section h3 {
            color: #FFFFFF;
            margin: 0 0 10px 0;
            font-size: 16px;
            font-weight: 500;
        }
        
        .filter-buttons {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
        }
        
        .filter-btn {
            background: #3A3A3C;
            border: none;
            color: #FFFFFF;
            padding: 8px 16px;
            border-radius: 20px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s;
        }
        
        .filter-btn:hover {
            background: #4A4A4C;
        }
        
        .filter-btn.active {
            background: #FFD700;
            color: #000000;
            font-weight: 600;
        }

        .no-classes {
            text-align: center;
            padding: 60px 20px;
            color: #666;
            font-size: 1.1rem;
            background: white;
            border-radius: 12px;
            max-width: 1000px;
            margin: 20px auto;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }

        footer {
            background-color: #000;
            color: #FFCC00;
            text-align: center;
            padding: 15px;
            border-top: 6px solid #FFCC00;
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
                <h1><span id="h11">YOUR</span> <span id="h12">CLASSES</span></h1>
                <a class="logout-btn" href="INDEX.php">
                    LOG OUT
                    <img src="../elements/PROFILE.png" alt="User Icon">
                </a>
            </div>

            <div class="content-area">
                <!-- Filter Buttons -->
                <div class="filter-section">
                    <h3>Filter by Class Type:</h3>
                    <div class="filter-buttons">
                        <button class="filter-btn active" data-type="all">All Classes</button>
                        <!-- Will be populated by JavaScript -->
                    </div>
                </div>

                <!-- Class List Container -->
                <div class="class-list">
                    <p>Loading classes...</p>
                </div>
                
                <script>
                // Firebase is already initialized in the sidebar
                // Use the global db and database objects from sidebar
                // No need to redeclare - they're already available globally
                


                // Function to fetch coach applications
                async function fetchCoachApplications() {
                    if (!db) {
                        console.error('Firestore not initialized');
                        return [];
                    }
                    
                    try {
                        console.log('Fetching coach applications...');
                        const gymId = '<?php echo addslashes($gymId); ?>';
                        console.log('Looking for gymId:', gymId);
                        
                        // Log the database object to ensure it's properly initialized
                        console.log('Firestore database object:', db);
                        
                        // Get all applications first
                        console.log('Fetching applications...');
                        const applicationsSnapshot = await db.collection('coachApplications').get();
                        console.log(`Found ${applicationsSnapshot.size} applications`);
                        
                        const applications = [];
                        const classTypes = new Set();
                        
                        // Process each application
                        for (const doc of applicationsSnapshot.docs) {
                            console.group('Document:', doc.id);
                            const data = doc.data();
                            console.log('Document data:', data);
                            
                            // Try different ways to get the gym ID
                            const docGymId = data.gym?.gymId || data.gymId || data.gym?.id || data.gymId;
                            console.log('Extracted gym IDs:', {
                                'data.gym?.gymId': data.gym?.gymId,
                                'data.gymId': data.gymId,
                                'data.gym?.id': data.gym?.id,
                                'Final docGymId': docGymId
                            });
                            
                            console.log('Looking for gym ID:', gymId);
                            
                            if (docGymId === gymId) {
                                console.log('MATCH FOUND! Adding class to list');
                                console.log('Class data:', data);
                                
                                let date = '';
                                console.log('Raw date value:', data.date);
                                
                                // Handle different date formats
                                if (data.date) {
                                    try {
                                        let dateObj;
                                        if (typeof data.date === 'string') {
                                            // If it's a string, parse as local date
                                            dateObj = new Date(data.date);
                                        } else if (data.date.date) {
                                            dateObj = new Date(data.date.date);
                                        } else if (data.date.seconds) {
                                            // Firestore timestamp
                                            dateObj = new Date(data.date.seconds * 1000);
                                        }
                                        if (dateObj && !isNaN(dateObj.getTime())) {
                                            // Format as YYYY-MM-DD in local time
                                            date = dateObj.getFullYear() + '-' +
                                                   String(dateObj.getMonth() + 1).padStart(2, '0') + '-' +
                                                   String(dateObj.getDate()).padStart(2, '0');
                                        }
                                    } catch (e) {
                                        console.error('Error processing date:', e);
                                    }
                                }
                                console.log('Processed date:', date);
                                

                                
                                applications.push({
                                    id: doc.id,
                                    className: data.className || data.class || 'Unnamed Class',
                                    paymentStatus: (data.paymentStatus || 'Unpaid').toLowerCase(),
                                    date: date,
                                    time: data.time || data.appointmentTime || '',
                                    coachName: data.coachName || 'Coach',
                                    coachId: data.coachId || '',
                                    status: data.status || 'pending',
                                    fee: typeof data.fee !== 'undefined' ? data.fee : 0,
                                    maxStudents: typeof data.maxStudents !== 'undefined' ? data.maxStudents : 0,
                                    venueFee: typeof data.venueFee !== 'undefined' ? data.venueFee : 0,
                                    coachFee: typeof data.coachFee !== 'undefined' ? data.coachFee : 0,
                                    sessionId: data.sessionId || null
                                });
                                
                                console.log('Added to applications:', applications[applications.length - 1]);
                            } else {
                                console.log('Skipping - wrong gym ID');
                            }
                            
                            console.groupEnd();
                        }
                        
                        console.log('All applications:', applications);
    
                        updateClassList(applications);
                        
                        return applications;
                    } catch (error) {
                        console.error('Error fetching applications:', error);
                        return [];
                    }
                }
                
                // Update the class list
                async function updateClassList(applications) {
                    const classList = document.querySelector('.class-list');
                    if (!classList) return;
                    
                    // Clear existing classes
                    classList.innerHTML = '';
                    
                    if (applications.length === 0) {
                        classList.innerHTML = '<p>No classes found for this gym.</p>';
                        return;
                    }
                    
                    // Sort applications by date and time
                    applications.sort((a, b) => {
                        const dateA = new Date(a.date + 'T' + (a.time || '00:00'));
                        const dateB = new Date(b.date + 'T' + (b.time || '00:00'));
                        return dateA - dateB;
                    });
                    
                    // Add classes to the list
                    for (const cls of applications) {
                        // Get attendee count for this class
                        let attendeeCount = 0;
                        try {
                            if (cls.sessionId) {
                                const sessionBookingsRef = firebase.firestore().collection('sessionBookings');
                                const querySnapshot = await sessionBookingsRef
                                    .where('sessionId', '==', cls.sessionId)
                                    .get();
                                attendeeCount = querySnapshot.size;
                            }
                        } catch (error) {
                            console.error('Error fetching attendee count for class:', cls.id, error);
                        }
                        
                        // Format the date and time
                        let dateStr = '';
                        let timeStr = '';
                        
                        try {
                            // Handle date
                            if (cls.date) {
                                let dateObj;
                                if (cls.date.toDate) {
                                    dateObj = cls.date.toDate();
                                } else if (cls.date.seconds) {
                                    dateObj = new Date(cls.date.seconds * 1000);
                                } else if (typeof cls.date === 'string') {
                                    dateObj = new Date(cls.date);
                                } else {
                                    dateObj = new Date(cls.date);
                                }
                                
                                if (!isNaN(dateObj.getTime())) {
                                    // Format date as "June 10, 2025"
                                    dateStr = dateObj.toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    });
                                    
                                    // Format time if available
                                    if (cls.time) {
                                        const [hours, minutes] = cls.time.split(':');
                                        const time = new Date(dateObj);
                                        time.setHours(parseInt(hours), parseInt(minutes || '0'));
                                        timeStr = time.toLocaleTimeString('en-US', { 
                                            hour: '2-digit', 
                                            minute: '2-digit',
                                            hour12: true
                                        });
                                    }
                                }
                            }
                        } catch (e) {
                            console.error('Error formatting date/time:', e);
                        }
                        
                        // Create the class item HTML with original layout
                        const classItem = document.createElement('div');
                        classItem.className = 'class-item';
                        classItem.dataset.type = cls.className || '';
                        
                        // Escape special characters for the class name in the onclick handler
                        const safeClassName = (cls.className || 'Class').replace(/'/g, "\\'");
                        
                        classItem.innerHTML = `
                            <div class="class-time">
                                <div class="time">${timeStr || 'TBD'}</div>
                                <div class="date">${dateStr || ''}</div>
                            </div>
                            <div class="class-details">
                                <div class="class-info">
                                    <span class="class-name">${cls.className || 'Unnamed Class'}</span>
                                    <span class="class-coach">with ${cls.coachName || 'No Coach'}</span>
                                </div>
                                <div class="class-stats">
                                    <span class="class-students">${typeof cls.maxStudents !== 'undefined' ? cls.maxStudents : 'N/A'} students max</span>
                                    <span class="class-fee">${typeof cls.fee !== 'undefined' ? parseFloat(cls.fee).toFixed(2) : '0.00'}</span>
                                    <span class="class-payment-status">${(cls.paymentStatus || 'Unpaid').charAt(0).toUpperCase() + (cls.paymentStatus || 'Unpaid').slice(1)}</span>
                                </div>
                                <div class="attendee-count-display">
                                    <span class="attendee-count-text">${attendeeCount} Attendee${attendeeCount === 1 ? '' : 's'}</span>
                                </div>
                            </div>
                            <button class="view-details-btn" onclick="viewClassDetails('${cls.id || ''}', '${safeClassName}', '${dateStr} • ${timeStr}')">
                                View Details
                            </button>`;
                        
                           const paymentStatusSpan = classItem.querySelector('.class-payment-status');
if (paymentStatusSpan) {
    const status = (cls.paymentStatus || 'unpaid').toLowerCase();
    let bgColor = '#999'; // default gray
    if (status === 'paid') bgColor = '#4CAF50';
    else if (status === 'unpaid') bgColor = '#f44336';
    else if (status === 'rejected') bgColor = '#9e9e9e';
    else if (status === 'deleted') bgColor = '#616161';
    Object.assign(paymentStatusSpan.style, {
        backgroundColor: bgColor,
        color: '#fff',
        padding: '6px 18px',
        borderRadius: '999px',
        fontSize: '1em',
        fontWeight: 'bold',
        display: 'inline-block',
        marginTop: '4px',
        whiteSpace: 'nowrap',
        boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
        letterSpacing: '0.5px',
        border: 'none',
    });
}                        
                        
                        classList.appendChild(classItem);
                    }
                    
                    // Add CSS for attendee count display
                    const style = document.createElement('style');
                    style.textContent = `
                        .attendee-count-display {
                            margin-top: 8px;
                        }
                        .attendee-count-text {
                            color: #FFD700;
                            font-weight: 600;
                            font-size: 0.9em;
                        }
                    `;
                    document.head.appendChild(style);
                }
                
                
                let allApplications = [];
                let classTypes = [];
                
                // Process and display attendees
                function processAttendees(snapshot, container) {
                    let attendeesHtml = '';
                    const attendees = [];
                    
                    // Process each booking
                    snapshot.forEach(doc => {
                        const booking = doc.data();
                        console.log('Processing booking:', { id: doc.id, data: booking });
                        
                        // Log all fields in the booking for debugging
                        console.log('All fields in booking:', Object.keys(booking).map(key => ({
                            key,
                            value: booking[key],
                            type: typeof booking[key]
                        })));
                        
                        // Try different field names for client name
                        const clientName = booking.clientName || booking.memberName || 'Unknown Client';
                        const status = booking.status || booking.paymentStatus || 'unpaid';
                        
                        attendees.push({
                            name: clientName,
                            status: status,
                            timestamp: booking.timestamp || booking.bookingTime || null,
                            bookingId: doc.id,
                            rawData: booking // Include full data for debugging
                        });
                    });
                    
                    console.log('Processed attendees:', attendees);
                    
                    // Sort attendees by status (paid first) and then by name
                    attendees.sort((a, b) => {
                        if (a.status === b.status) {
                            return (a.name || '').localeCompare(b.name || '');
                        }
                        return a.status === 'paid' ? -1 : 1;
                    });
                    
                    // Generate HTML for each attendee
                    if (attendees.length > 0) {
                        console.log('Rendering', attendees.length, 'attendees');
                        attendeesHtml = `
                            <div class="attendee-header">
                                <span>Name</span>
                                <span>Status</span>
                            </div>
                            ${attendees.map(attendee => {
                                let timestamp = '';
                                if (attendee.timestamp) {
                                    try {
                                        // Handle both Firestore Timestamp and raw timestamp objects
                                        const date = attendee.timestamp.seconds 
                                            ? new Date(attendee.timestamp.seconds * 1000)
                                            : new Date(attendee.timestamp);
                                        timestamp = date.toLocaleString();
                                    } catch (e) {
                                        console.error('Error formatting timestamp:', e);
                                        timestamp = 'Invalid date';
                                    }
                                }
                                
                                console.log('Rendering attendee:', { 
                                    name: attendee.name, 
                                    status: attendee.status,
                                    timestamp: timestamp || 'No timestamp'
                                });
                                
                                return `
                                    <div class="attendee-item">
                                        <div class="attendee-info">
                                            <div class="attendee-name">${attendee.name}</div>
                                            ${timestamp ? 
                                                `<div class="attendee-time">${timestamp}</div>` : 
                                                ''}
                                        </div>
                                        <div class="payment-status ${attendee.status}">
                                            ${attendee.status === 'paid' ? 'Paid' : 'Unpaid'}
                                        </div>
                                    </div>`;
                            }).join('')}
                        `;
                    } else {
                        console.log('No attendees to render');
                        attendeesHtml = `
                            <p>No attendees found for this class.</p>
                            <p>Debug info: Check console for query details</p>
                        `;
                    }
                    
                    container.innerHTML = attendeesHtml;
                }
                
                // View class details and show attendees
                async function viewClassDetails(classId, className, classTime) {
                    try {
                        // Show loading state
                        const modal = document.getElementById('classDetailsModal');
                        const classNameElement = document.getElementById('className');
                        const classTimeElement = document.getElementById('classTime');
                        const attendeesContainer = document.getElementById('attendeesContainer');
                        
                        // Set class info
                        classNameElement.textContent = className;
                        classTimeElement.textContent = classTime;
                        attendeesContainer.innerHTML = '<p>Loading attendees...</p>';
                        
                        // Show the modal
                        modal.style.display = 'block';
                        
                        console.log('Fetching attendees for session:', { classId, className });
                        
                        // 1. First, get the session details from coachApplications
                        const coachAppRef = firebase.firestore().collection('coachApplications');
                        const sessionDoc = await coachAppRef.doc(classId).get();
                        
                        if (!sessionDoc.exists) {
                            throw new Error('Session not found in coachApplications');
                        }
                        
                        const sessionData = sessionDoc.data();
                        console.log('Session data:', sessionData);
                        
                        // Get the sessionId from the coachApplication document
                        const sessionId = sessionData.sessionId;
                        
                        if (!sessionId) {
                            throw new Error('No sessionId found in coach application');
                        }
                        
                        console.log('Using sessionId from coachApplication:', sessionId);
                        
                        // 2. Find all sessionBookings that match this sessionId
                        const sessionBookingsRef = firebase.firestore().collection('sessionBookings');
                        const querySnapshot = await sessionBookingsRef
                            .where('sessionId', '==', sessionId)
                            .get();
                        
                        console.log('Matching sessionBookings:', {
                            size: querySnapshot.size,
                            docs: querySnapshot.docs.map(doc => ({
                                id: doc.id,
                                data: doc.data()
                            }))
                        });
                        
                        if (querySnapshot.empty) {
                            console.log('No matching session bookings found');
                            attendeesContainer.innerHTML = `
                                <p>No attendees found for this class.</p>
                            `;
                            return;
                        }
                        
                        // 3. Process the matching session bookings
                        const attendees = [];
                        
                        for (const doc of querySnapshot.docs) {
                            const booking = doc.data();
                            console.log('Processing booking:', { id: doc.id, data: booking });
                            
                            // Get clientName and status from the booking
                            const clientName = booking.clientName || 'Unknown Client';
                            
                            // Debug log the entire booking to see all available fields
                            console.log('Booking data:', booking);
                            
                            // Get status from the booking, defaulting to 'unpaid' if not found
                            // Check both 'status' and 'paymentStatus' fields
                            let status = 'unpaid';
                            if (booking.status) {
                                status = booking.status.toLowerCase();
                            } else if (booking.paymentStatus) {
                                status = booking.paymentStatus.toLowerCase();
                            } else if (booking.payment_status) {
                                status = booking.payment_status.toLowerCase();
                            }
                            
                            // Ensure status is either 'paid' or 'unpaid'
                            if (status !== 'paid' && status !== 'unpaid') {
                                console.log('Invalid status found, defaulting to unpaid. Status was:', status);
                                status = 'unpaid';
                            }
                            
                            console.log('Processed status for', clientName, ':', status);
                            
                            // Only add if we have a client name
                            if (clientName && clientName !== 'Unknown Client') {
                                attendees.push({
                                    name: clientName,
                                    status: status,
                                    timestamp: booking.timestamp || null,
                                    bookingId: doc.id
                                });
                            }
                        }
                        
                        // 4. Display the attendees
                        if (attendees.length > 0) {
                            // Sort by status (paid first) and then by name
                            attendees.sort((a, b) => {
                                if (a.status === b.status) {
                                    return a.name.localeCompare(b.name);
                                }
                                return a.status === 'paid' ? -1 : 1;
                            });
                            
                            // Generate HTML
                            const attendeesHtml = `
                                <div class="attendee-header">
                                    <div class="header-name">Name</div>
                                    <div class="header-status">Status</div>
                                </div>
                                <div class="attendee-list">
                                    ${attendees.map(attendee => `
                                        <div class="attendee-item">
                                            <div class="attendee-name">${attendee.name}</div>
                                            <div class="payment-status ${attendee.status}">
                                                ${attendee.status === 'paid' ? 'Paid' : 'Unpaid'}
                                            </div>
                                        </div>
                                        ${attendee.timestamp ? 
                                            `<div class="attendee-time">
                                                ${new Date(attendee.timestamp.seconds * 1000).toLocaleString()}
                                            </div>` : ''}
                                    `).join('')}
                                </div>
                                <style>
                                    .attendee-header {
                                        display: flex;
                                        padding: 10px;
                                        font-weight: bold;
                                        border-bottom: 1px solid #444;
                                    }
                                    .header-name {
                                        flex: 1;
                                    }
                                    .header-status {
                                        width: 100px;
                                        text-align: right;
                                    }
                                    .attendee-list {
                                        max-height: 400px;
                                        overflow-y: auto;
                                    }
                                    .attendee-item {
                                        display: flex;
                                        padding: 10px;
                                        border-bottom: 1px solid #333;
                                        align-items: center;
                                    }
                                    .attendee-name {
                                        flex: 1;
                                    }
                                    .payment-status {
                                        width: 100px;
                                        text-align: right;
                                        padding: 4px 8px;
                                        border-radius: 4px;
                                        font-weight: 500;
                                    }
                                    .payment-status.paid {
                                        background-color: #2e7d32;
                                        color: white;
                                    }
                                    .payment-status.unpaid {
                                        background-color: #ff5722;
                                        color: white;
                                    }
                                    .attendee-time {
                                        width: 100%;
                                        font-size: 0.85em;
                                        color: #aaa;
                                        padding: 0 10px 10px 10px;
                                    }
                                </style>
                            `;
                            
                            attendeesContainer.innerHTML = attendeesHtml;
                        } else {
                            attendeesContainer.innerHTML = '<p>No attendees found for this class.</p>';
                        }
                        
                        // Add event listener for close button
                        const closeBtn = document.querySelector('.close-modal');
                        if (closeBtn) {
                            closeBtn.onclick = function() {
                                modal.style.display = 'none';
                            };
                        }
                        
                        // Close when clicking outside the modal
                        window.onclick = function(event) {
                            if (event.target === modal) {
                                modal.style.display = 'none';
                            }
                        };                      
                    } catch (error) {
                        console.error('Error in viewClassDetails:', error);
                        const attendeesContainer = document.getElementById('attendeesContainer');
                        if (attendeesContainer) {
                            attendeesContainer.innerHTML = `
                                <p>Error: ${error.message || 'Failed to load attendees'}</p>
                                <p>Please check the console for details.</p>
                                <p>Error details: ${JSON.stringify({
                                    name: error.name,
                                    message: error.message,
                                    stack: error.stack
                                }, null, 2)}</p>
                            `;
                        }
                    }
                }
                
                // Close modal when clicking the X
                document.querySelector('.close-modal')?.addEventListener('click', function() {
                    document.getElementById('classDetailsModal').style.display = 'none';
                });
                
                // Close modal when clicking outside the modal content
                window.addEventListener('click', function(event) {
                    const modal = document.getElementById('classDetailsModal');
                    if (event.target === modal) {
                        modal.style.display = 'none';
                    }
                });
                
                // Function to filter classes by type
                function filterClasses(type) {
                    console.log('Filtering classes by type:', type);
                    
                    // Update active button
                    document.querySelectorAll('.filter-btn').forEach(btn => {
                        btn.classList.toggle('active', btn.dataset.type === type);
                    });
                    
                    // Filter applications by matching className with the selected type
                    const filtered = type === 'all' 
                        ? allApplications 
                        : allApplications.filter(cls => {
                            // Check both className and classType for compatibility
                            const matches = cls.className === type || cls.classType === type;
                            console.log('Class:', cls.className, 'matches', type, ':', matches);
                            return matches;
                        });
                    
                    console.log('Filtered classes:', filtered);
                    updateClassList(filtered);
                }
                
                // Initialize everything when the page loads
                document.addEventListener('DOMContentLoaded', async function() {
                    console.log('DOM fully loaded, starting initialization...');
                    
                    // Log the gym ID we're looking for
                    const gymId = '<?php echo addslashes($gymId); ?>';
                    console.log('Looking for classes with gymId:', gymId);
                    
                    if (!gymId) {
                        console.error('No gym ID found!');
                        const classList = document.querySelector('.class-list');
                        if (classList) {
                            classList.innerHTML = '<p>Error: No gym ID found. Please log in again.</p>';
                        }
                        return;
                    }
                    
                    try {
                        // Initialize Firebase Database
                        const database = firebase.database();
                        
                        // First, get the gym data from the gyms node
                        const gymRef = database.ref(`gyms/${gymId}`);
                        const gymSnapshot = await gymRef.once('value');
                        const gymData = gymSnapshot.val();
                        
                        console.log('Gym Data:', gymData);
                        
                        let classTypesList = [];
                        
                        if (gymData) {
                            console.log('Gym data:', gymData);
                            
                            // Check if gymInfo exists and has classTypesList
                            if (gymData.gymInfo && gymData.gymInfo.classTypesList) {
                                console.log('Found classTypesList in gymData.gymInfo:', gymData.gymInfo.classTypesList);
                                
                                // If it's an array, use it directly
                                if (Array.isArray(gymData.gymInfo.classTypesList)) {
                                    classTypesList = gymData.gymInfo.classTypesList;
                                } 
                                // If it's an object, convert to array of objects with id and name
                                else if (typeof gymData.gymInfo.classTypesList === 'object') {
                                    classTypesList = Object.entries(gymData.gymInfo.classTypesList)
                                        .map(([id, name]) => ({
                                            id: id,
                                            name: name
                                        }));
                                }
                                
                                console.log('Processed class types:', classTypesList);
                            } else {
                                console.log('No classTypesList found in gymData.gymInfo');
                            }
                        }
                        
                        console.log('Class Types List:', classTypesList);
                        
                        // Populate filter buttons
                        const filterContainer = document.querySelector('.filter-buttons');
                        if (filterContainer && classTypesList && classTypesList.length > 0) {
                            // Add 'All' button
                            filterContainer.innerHTML = `
                                <button class="filter-btn active" data-type="all" onclick="filterClasses('all')">All Classes</button>
                                ${classTypesList.map(type => {
                                    const typeName = type.name || type; // Handle both object and string types
                                    const typeValue = type.id || type; // Use id if available, otherwise use the type itself
                                    // Create a safe string for the onclick handler
                                    const safeTypeValue = typeValue.replace(/'/g, "\\'");
                                    return `
                                        <button class="filter-btn" data-type="${typeValue}" 
                                                onclick="filterClasses('${safeTypeValue}')">
                                            ${typeName}
                                        </button>`;
                                }).join('')}
                            `;
                        } else {
                            console.warn('No class types found or invalid format:', classTypesList);
                            filterContainer.innerHTML = '<p>No class types available</p>';
                        }
                        
                        // Fetch and display classes
                        allApplications = await fetchCoachApplications();
                        console.log('Fetched classes:', allApplications);
                        
                        // Show all classes by default
                        filterClasses('all');
                        
                    } catch (error) {
                        console.error('Error:', error);
                        const classList = document.querySelector('.class-list');
                        if (classList) {
                            classList.innerHTML = `<p>Error loading classes: ${error.message}</p>`;
                        }
                    }
                });
                
                </script>
            </div>

            <!-- Class Details Modal -->
            <div id="classDetailsModal" class="modal">
                <div class="modal-content">
                    <span class="close-modal">&times;</span>
                    <h2>Class Details</h2>
                    <div id="classDetails">
                        <h3 id="className"></h3>
                        <p id="classTime"></p>
                        <div class="attendees-list">
                            <h4>Attendees</h4>
                            <div id="attendeesContainer">
                                <!-- Attendees will be listed here -->
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <footer>
                &copy; 2025 XPASYO. All rights reserved.
            </footer>
        </div>
    </div>
</body>
</html>
