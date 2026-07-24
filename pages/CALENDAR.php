<?php
// Start the session if it's not already started
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Debug: Log session data
// echo '<pre>Session data: ' . print_r($_SESSION, true) . '</pre>';

// Include the sidebar function
require_once __DIR__ . '/sidebar.php';

// Generate the sidebar with current page highlighted
$sidebar = generateSidebar('CALENDAR');

// Store the gym ID in a JavaScript variable, fallback to user_id if not set
$gymId = isset($_SESSION['gymId']) ? $_SESSION['gymId'] : (isset($_SESSION['user_id']) ? $_SESSION['user_id'] : '');
?>

<!-- Debug info (uncomment if needed) -->
<!-- <div style="display:none;" id="debugInfo">
    Gym ID from PHP: <?php echo htmlspecialchars($gymId); ?>
    <br>
    Session ID: <?php echo session_id(); ?>
</div> -->
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>XPASYO - Calendar</title>
    <link rel="icon" type="image/png" href="../elements/logo web.png">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css" rel="stylesheet">
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

        footer {
            background-color: #000;
            color: #FFCC00;
            text-align: center;
            padding: 15px;
            border-top: 6px solid #FFCC00;
        }

        /* Calendar Styles */
        .main-content {
            margin-left: 250px;
            width: calc(100% - 250px);
            padding: 0;
            box-sizing: border-box;
        }

        .content-area {
            padding: 20px 40px;
            width: 100%;
            box-sizing: border-box;
        }

        .calendar {
            width: 100%;
            margin: 0 auto;
            padding: 0;
            text-align: center;
            box-sizing: border-box;
            max-width: 1200px;
        }

        .calendar .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 20px;
            background-color: #000;
            color: #fff;
            border-radius: 8px 8px 0 0;
            margin: 0;
            width: 100%;
            box-sizing: border-box;
            cursor: default;
        }
        
        .calendar .header > div {
            display: flex;
            align-items: center;
            gap: 15px;
        }
        
        #todayBtn {
            background: #FFCC00;
            color: #000;
            border: none;
            padding: 5px 10px;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
            font-size: 0.9em;
        }
        
        #todayBtn:hover {
            background: #ffd633;
        }
        
        #monthYear {
            cursor: pointer;
            user-select: none;
        }
        
        #monthYear span:hover {
            color: #FFCC00;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        th {
            padding: 10px;
            text-align: center;
            background-color: #f5f5f5;
            border-bottom: 2px solid #ddd;
            color: #555;
            font-weight: 600;
        }

        td {
            border: 1px solid #eee;
            padding: 5px;
            height: 80px;
            vertical-align: top;
            position: relative;
            cursor: pointer;
        }

        /* Highlight current date */
        .today {
            background-color: #fff3cd;
            color: #000;
            font-weight: bold;
        }

        .today::after {
            content: 'Today';
            position: absolute;
            bottom: 2px;
            left: 0;
            right: 0;
            font-size: 10px;
            font-weight: normal;
            color: #ff9800;
        }

        /* Style for weekend days */
        td:first-child, td:last-child {
            color: #ff5722;
            background-color: #fff9f7;
        }

        td {
            background-color: #fff; /* White background for days */
            font-weight: bold; /* Bold font for the days */
            color: #000; /* Black text color */
        }

        /* Highlight current date */
        .today {
            background-color: #343a40; /* Dark background for today's date */
            color: #fff; /* White text color for today's date */
        }
        
        /* Appointment date styling */
        .has-appointment {
            background-color: #e6f7ff; /* Light blue background */
            color: #0056b3; /* Darker blue text */
            position: relative;
            font-weight: bold;
        }
        
        .appointment-marker {
            display: none; /* Hide the marker since we're using ::after */
        }
        
        .appointment-details {
            display: none;
            position: absolute;
            top: 100%;
            left: 50%;
            transform: translateX(-50%);
            background: white;
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 15px;
            z-index: 1000;
            min-width: 220px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            font-size: 14px;
        }
        
        .appointment-item {
            padding: 8px 0;
            border-bottom: 1px solid #f0f0f0;
            margin-bottom: 5px;
        }
        
        .appointment-item:last-child {
            border-bottom: none;
            margin-bottom: 0;
            padding-bottom: 0;
        }
        
        .has-appointment::after {
            content: '';
            position: absolute;
            bottom: 4px;
            left: 50%;
            transform: translateX(-50%);
            width: 6px;
            height: 6px;
            background-color: #1890ff;
            border-radius: 50%;
        }

        /* Styling for weekend */
        td:nth-child(1), td:nth-child(7) {
            color: #ffc107; /* Yellow color for Sunday and Saturday */
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
                <h1><span id="h11">YOUR</span> <span id="h12">CALENDAR</span></h1>
                <a class="logout-btn" href="INDEX.php">
                    LOG OUT
                    <img src="../elements/PROFILE.png" alt="User  Icon">
                </a>
            </div>

            <div class="content-area">
                <!-- Calendar -->
                <div class="calendar">
                    <div class="header">
                        <button id="prevMonth" title="Previous Month"> &lt; </button>
                        <div>
                            <button id="todayBtn" title="Go to Today">TODAY</button>
                            <span id="monthYear">MAY 2025</span>
                        </div>
                        <button id="nextMonth" title="Next Month"> &gt; </button>
                    </div>
                    
                    <table id="calendarTable">
                        <tr>
                            <th>SUNDAY</th>
                            <th>MONDAY</th>
                            <th>TUESDAY</th>
                            <th>WEDNESDAY</th>
                            <th>THURSDAY</th>
                            <th>FRIDAY</th>
                            <th>SATURDAY</th>
                        </tr>
                        <!-- Calendar days will be populated here -->
                    </table>
                </div>
            </div>

            <footer>
                &copy; 2025 XPASYO. All rights reserved.
            </footer>
        </div>
    </div>

    <script>
        // Firebase is already initialized in the sidebar
        // Use the global db object from sidebar
        
        // Function to fetch all coach application dates
        async function fetchCoachApplicationDates() {
            if (!db) {
                console.error('Firebase not initialized');
                return [];
            }
            
            try {
                // Get all documents from the coachApplications collection
                console.log('Fetching all coach applications...');
                const querySnapshot = await db.collection('coachApplications').get();
                
                if (querySnapshot.empty) {
                    console.log('No documents found in coachApplication collection');
                    return [];
                }
                
                console.log(`Found ${querySnapshot.size} total documents`);
                
                // Process all documents with dates
                const events = [];
                
                querySnapshot.forEach(doc => {
                    const data = doc.data();
                    console.log(`doc.id = ${doc.id}, status =`, data.status);

                    
                    // Debug log each document
                    console.log(`Processing document ${doc.id}:`, data);
                    
                    // Check if document has a date field and matches the user's gymId
                    const docGymId = data.gym?.gymId || data.gymId; // Check both locations
                    if (data.date && docGymId === '<?php echo addslashes($gymId); ?>') {
                        try {
                            let eventDate;
                            
                            // Handle both Firestore Timestamp and string dates
                            if (data.date.toDate) {
                                // If it's a Firestore Timestamp
                                eventDate = data.date.toDate();
                            } else if (typeof data.date === 'string') {
                                // If it's a string, parse as local date
                                eventDate = new Date(data.date);
                                if (isNaN(eventDate.getTime())) {
                                    console.error(`Invalid date string in document ${doc.id}:`, data.date);
                                    return; // Skip this document if date is invalid
                                }
                            } else if (data.date.seconds) {
                                // Firestore timestamp
                                eventDate = new Date(data.date.seconds * 1000);
                            } else {
                                console.error(`Unsupported date format in document ${doc.id}:`, data.date);
                                return; // Skip this document if date format is not supported
                            }
                            
                            events.push({
                                date: eventDate,
                                id: doc.id,
                               
                                   paymentStatus: (data.paymentStatus || 'Unpaid').toLowerCase(),
                                // Include additional fields from the document
                                title: data.coachName || 'Appointment',
                                coachName: data.coachName || '',
                                className: data.className || data.class || data.className || '', // Check multiple possible field names
                                time: data.time || data.appointmentTime || '',
                                fee: data.fee || data.feeAmount || 0,
                                maxStudents: data.maxStudents || 0,
                                coachId: data.coachId || ''
                                
                            });
                            
                            console.log(`Added event from document ${doc.id} with date:`, eventDate);
                        } catch (error) {
                            console.error(`Error processing document ${doc.id}:`, error);
                        }
                    } else {
                        console.log(`Document ${doc.id} skipped - no date field or doesn't match user's gymId`);
                    }
                });
                
                console.log(`Successfully processed ${events.length} calendar events`);
                return events;
                
            } catch (error) {
                console.error('Error fetching coach applications:', error);
                return [];
            }
        }
    </script>
    <script>
        // Initialize with current date
        const today = new Date();
        let currentMonth = today.getMonth();
        let currentYear = today.getFullYear();
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        let coachApplicationDates = []; // Store the coach application dates
        
        // Store original date for 'Today' button
        const originalDate = { month: today.getMonth(), year: today.getFullYear() };
        
        const updateCalendar = () => {
            const calendarTable = document.getElementById('calendarTable');
            const monthYear = document.getElementById('monthYear');
            
            // Clear existing days
            calendarTable.innerHTML = '';
            
                // Create clickable month and year
            const monthSpan = document.createElement('span');
            monthSpan.textContent = monthNames[currentMonth];
            monthSpan.style.cursor = 'pointer';
            monthSpan.style.textDecoration = 'underline';
            monthSpan.style.padding = '0 5px';
            monthSpan.title = 'Click to change month';
            
            const yearSpan = document.createElement('span');
            yearSpan.textContent = currentYear;
            yearSpan.style.cursor = 'pointer';
            yearSpan.style.textDecoration = 'underline';
            yearSpan.style.padding = '0 5px';
            yearSpan.title = 'Click to change year (Shift+Click to go back)';
            
            // Add tooltip to show navigation instructions
            const tooltip = document.createElement('div');
            tooltip.textContent = 'Click month/year to navigate';
            tooltip.style.fontSize = '0.8em';
            tooltip.style.color = '#aaa';
            tooltip.style.marginTop = '5px';
            
            // Clear and set new month/year display
            monthYear.innerHTML = '';
            monthYear.appendChild(monthSpan);
            monthYear.appendChild(yearSpan);
            
            // Create header row with day names
            const headerRow = document.createElement('tr');
            ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(day => {
                const th = document.createElement('th');
                th.textContent = day;
                headerRow.appendChild(th);
            });
            calendarTable.appendChild(headerRow);
            
            const firstDay = new Date(currentYear, currentMonth, 1).getDay();
            const lastDate = new Date(currentYear, currentMonth + 1, 0).getDate();
            const today = new Date();

            // Create empty cells for the first week
            let currentRow = calendarTable.insertRow(1);
            for (let i = 0; i < firstDay; i++) {
                currentRow.insertCell(i); // Empty cells
            }

            // Populate the calendar with days
            for (let date = 1; date <= lastDate; date++) {
                if ((firstDay + date - 1) % 7 === 0 && date !== 1) {
                    currentRow = calendarTable.insertRow(calendarTable.rows.length);
                }
                const cell = currentRow.insertCell((firstDay + date - 1) % 7);
                cell.textContent = date; // Fill the cell with date
                
                // Create a date object for the current cell
                const cellDate = new Date(currentYear, currentMonth, date);
                
                // Find all applications for this date
                const dateApps = coachApplicationDates.filter(app => {
                    // Ensure we have a valid date object
                    const appDate = app.date instanceof Date ? app.date : new Date(app.date);
                    if (isNaN(appDate.getTime())) {
                        console.error('Invalid date in application:', app);
                        return false;
                    }
                    return (
                        appDate.getDate() === date && 
                        appDate.getMonth() === currentMonth && 
                        appDate.getFullYear() === currentYear
                    );
                });
                
                const hasApplication = dateApps.length > 0;
                
                // Highlight today's date
                if (date === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear()) {
                    cell.classList.add('today');
                }
                
                // Add a marker and details for dates with coach applications
                if (hasApplication) {
                    // Add a class to style the cell
                    cell.classList.add('has-appointment');
                    
                    // Create a container for the appointment details
                    const appContainer = document.createElement('div');
                    appContainer.className = 'appointment-details';
                    
                    // Add each application's details
                    dateApps.forEach(app => {
                        const appDetail = document.createElement('div');
                        appDetail.className = 'appointment-item';
                        
                        // Build the details HTML
                        let detailsHTML = '';
                        
                        // Add coach name
                        if (app.coachName) {
                            detailsHTML += `<strong>Coach: ${app.coachName}</strong><br>`;
                        } else if (app.title) {
                            detailsHTML += `<strong>${app.title}</strong><br>`;
                        } else {
                            detailsHTML += `<strong>Appointment</strong><br>`;
                        }
                        
                        // Add class name if available
                        if (app.className) {
                            detailsHTML += `Class: ${app.className}<br>`;
                        }
                        
                        // Add time if available
                        if (app.time) {
                            detailsHTML += `${app.time}<br>`;
                        }
                        
                        // Add fee if available
                        if (app.fee) {
                            detailsHTML += `₱${app.fee}`;
                        }
                        // Status
                    if (app.paymentStatus) {
                        const capitalizedPaymentStatus = app.paymentStatus.charAt(0).toUpperCase() + app.paymentStatus.slice(1);
                        let badgeColor = '#999'; // default gray
                        if (app.paymentStatus === 'paid') badgeColor = '#4CAF50';        // Green
                        else if (app.paymentStatus === 'unpaid') badgeColor = '#f44336'; // Red
                        else if (app.paymentStatus === 'pending') badgeColor = '#FFC107';// Yellow
                        detailsHTML += `<br><span class="status-badge" style="background-color: ${badgeColor}; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.75em;">${capitalizedPaymentStatus}</span>`;
                    }


                        
                        appDetail.innerHTML = detailsHTML;
                        appContainer.appendChild(appDetail);
                    });
                    
                    // Add a marker that will show the details on hover
                    const marker = document.createElement('div');
                    marker.className = 'appointment-marker';
                    marker.title = `${dateApps.length} appointment${dateApps.length > 1 ? 's' : ''}`;
                    
                    // Make the entire cell clickable to show details
                    cell.addEventListener('click', (e) => {
                        e.stopPropagation();
                        // Hide all other open details first
                        document.querySelectorAll('.appointment-details').forEach(detail => {
                            if (detail !== appContainer) {
                                detail.style.display = 'none';
                            }
                        });
                        // Toggle this one
                        appContainer.style.display = appContainer.style.display === 'block' ? 'none' : 'block';
                    });
                    
                    // Close details when clicking outside
                    document.addEventListener('click', function closeAppDetails(e) {
                        if (!cell.contains(e.target)) {
                            appContainer.style.display = 'none';
                        }
                    });
                    
                    cell.appendChild(marker);
                    cell.appendChild(appContainer);
                    cell.style.position = 'relative';
                    cell.style.cursor = 'pointer';
                }
                
                // Date cell styling
                cell.style.cursor = 'default';
            }
        }

        // Navigation functionality
        function setupNavigation() {
            // Navigate to today's date
            document.getElementById('todayBtn').onclick = () => {
                currentMonth = originalDate.month;
                currentYear = originalDate.year;
                updateCalendar();
            };

            // Previous month navigation
            document.getElementById('prevMonth').onclick = () => {
                if (currentMonth === 0) {
                    currentMonth = 11; // December
                    currentYear--;
                } else {
                    currentMonth--;
                }
                updateCalendar();
            };

            // Next month navigation
            document.getElementById('nextMonth').onclick = () => {
                if (currentMonth === 11) {
                    currentMonth = 0; // January
                    currentYear++;
                } else {
                    currentMonth++;
                }
                updateCalendar();
            };
            
            // Get the month and year span elements
            const monthYearElement = document.getElementById('monthYear');
            
            // Create clickable month and year elements
            const monthSpan = document.createElement('span');
            monthSpan.textContent = monthNames[currentMonth];
            monthSpan.style.cursor = 'pointer';
            monthSpan.style.textDecoration = 'underline';
            monthSpan.style.padding = '0 5px';
            monthSpan.title = 'Click to change month';
            
            const yearSpan = document.createElement('span');
            yearSpan.textContent = currentYear;
            yearSpan.style.cursor = 'pointer';
            yearSpan.style.textDecoration = 'underline';
            yearSpan.style.padding = '0 5px';
            yearSpan.title = 'Click to change year (Shift+Click to go back)';
            
            // Clear and set new month/year display
            monthYearElement.innerHTML = '';
            monthYearElement.appendChild(monthSpan);
            monthYearElement.appendChild(document.createTextNode(' '));
            monthYearElement.appendChild(yearSpan);
            
            // Clicking month cycles through months
            monthSpan.onclick = (e) => {
                e.stopPropagation();
                currentMonth = (currentMonth + 1) % 12;
                updateCalendar();
            };
            
            // Clicking year cycles through years
            yearSpan.onclick = (e) => {
                e.stopPropagation();
                const change = e.shiftKey ? -1 : 1; // Shift+click to go back a year
                currentYear += change;
                updateCalendar();
            };
        }

        // Initialize the calendar and fetch coach application dates
        async function initCalendar() {
            try {
                console.log('Initializing calendar...');
                console.log('Session ID:', '<?php echo session_id(); ?>');
                console.log('Session status:', '<?php echo session_status(); ?>');
                console.log('All session vars:', <?php echo json_encode($_SESSION); ?>);
                
                // Set up navigation first
                setupNavigation();
                
                // Then fetch coach application dates
                console.log('Fetching coach application dates...');
                coachApplicationDates = await fetchCoachApplicationDates();
                console.log('Fetched dates:', coachApplicationDates);
                
                // Finally update the calendar display
                console.log('Updating calendar display...');
                updateCalendar();
                console.log('Calendar initialized successfully');
            } catch (error) {
                console.error('Error initializing calendar:', error);
                // Still try to set up basic functionality even if fetching fails
                setupNavigation();
                updateCalendar();
                console.log('Calendar initialized with basic functionality');
            }
        }
        
        // Add CSS for the appointment marker
        const style = document.createElement('style');
        style.textContent = `
            .appointment-marker {
                position: absolute;
                bottom: 2px;
                left: 50%;
                transform: translateX(-50%);
                width: 6px;
                height: 6px;
                background-color: #FFD700;
                border-radius: 50%;
            }
            td {
                position: relative;
                padding: 10px;
                text-align: center;
                vertical-align: top;
                height: 40px;
            }
        `;
        document.head.appendChild(style);
        
        // Call initCalendar to start everything
        console.log('Starting calendar initialization...');
        initCalendar();
    </script>
</body>
</html>
