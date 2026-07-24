<?php
// Start the session if not already started
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Include the sidebar function
require_once __DIR__ . '/sidebar.php';

// Generate the sidebar with current page highlighted
$sidebar = generateSidebar('GYM');
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Your Gym</title>
    <link rel="icon" type="image/png" href="../elements/logo web.png">
    <!-- Font Awesome for icons -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <script>
    console.log('SCRIPT STARTED - if you see this, JavaScript is running');
    // Firebase is already initialized in the sidebar
    // Use the global database and auth objects from sidebar

    // Get gym data from PHP session
    <?php
    if (isset($_SESSION['gym_data'])) {
        // Get gym address
        $gymAddress = $_SESSION['gym_data']['gym_address'] ?? null;
        $classTypesList = $_SESSION['gym_data']['gymInfo']['classTypesList'] ?? [
            'Zumba', 'Yoga', 'HIIT', 'Circuit Training', 'Aerobics', 'Pilates'
        ];
        
        // This PHP block is problematic because it mixes PHP with JS variables.
        // The fetching will be handled purely in JavaScript after this.

        // Get gym name with fallbacks
        $gymName = 'Your Gym';
        if (!empty($_SESSION['gym_data']['gym_name'])) {
            $gymName = $_SESSION['gym_data']['gym_name'];
        } elseif (!empty($_SESSION['gym_data']['gymInfo']['name'])) {
            $gymName = $_SESSION['gym_data']['gymInfo']['name'];
        } elseif (!empty($_SESSION['gym_data']['name'])) {
            $gymName = $_SESSION['gym_data']['name'];
        }

        // Get gym description with fallbacks
        $gymDescription = 'Welcome to our gym! Edit this description to tell people about your facility.';
        if (!empty($_SESSION['gym_data']['gym_description'])) {
            $gymDescription = $_SESSION['gym_data']['gym_description'];
        } elseif (!empty($_SESSION['gym_data']['gymInfo']['description'])) {
            $gymDescription = $_SESSION['gym_data']['gymInfo']['description'];
        } elseif (!empty($_SESSION['gym_data']['description'])) {
            $gymDescription = $_SESSION['gym_data']['description'];
        }

        // Get GCash Info - This will be fetched via JS to ensure it's up-to-date
        $gcashAccountName = 'Loading...';
        $gcashAccountNumber = 'Loading...';

        // Get gym logo with fallbacks
        $gymLogo = '';
        $isBase64Logo = false;
        $logoFound = false;
        
        // Check gym_logo first
        if (!empty($_SESSION['gym_data']['gym_logo'])) {
            if (is_array($_SESSION['gym_data']['gym_logo']) && !empty($_SESSION['gym_data']['gym_logo']['data'])) {
                $gymLogo = $_SESSION['gym_data']['gym_logo']['data'];
                $isBase64Logo = true;
                $logoFound = true;
            } else {
                $gymLogo = $_SESSION['gym_data']['gym_logo'];
                $logoFound = true;
            }
        }
        
        // Check gymInfo.logo if not found yet
        if (!$logoFound && !empty($_SESSION['gym_data']['gymInfo']['logo'])) {
            $tempLogo = $_SESSION['gym_data']['gymInfo']['logo'];
            if (is_array($tempLogo) && !empty($tempLogo['data'])) {
                $gymLogo = $tempLogo['data'];
                $isBase64Logo = true;
                $logoFound = true;
            } else {
                $gymLogo = $tempLogo;
                $logoFound = true;
            }
        }
        
        // Check uploads.gym-logo if still not found
        if (!$logoFound && !empty($_SESSION['gym_data']['uploads']['gym-logo'])) {
            $tempLogo = $_SESSION['gym_data']['uploads']['gym-logo'];
            if (is_array($tempLogo) && !empty($tempLogo['data'])) {
                $gymLogo = $tempLogo['data'];
                $isBase64Logo = true;
            } else {
                $gymLogo = $tempLogo;
            }
        }

        // Detect image type for base64 logos
        if ($isBase64Logo) {
            $imgType = 'png'; // default
            if (strpos($gymLogo, 'data:image/') === 0) {
                $parts = explode(';', $gymLogo);
                $typePart = $parts[0];
                if (preg_match('/data:image\/([a-zA-Z+]+)/', $typePart, $matches)) {
                    $imgType = $matches[1];
                    $gymLogo = substr($gymLogo, strpos($gymLogo, ',') + 1);
                }
            } elseif (strpos($gymLogo, '/9j/') === 0) {
                $imgType = 'jpeg';
            } elseif (strpos($gymLogo, 'iVBORw0KGgo') === 0) {
                $imgType = 'png';
            } elseif (strpos($gymLogo, 'R0lGOD') === 0) {
                $imgType = 'gif';
            }
        }
    } else {
        $gymAddress = 'No address available';
        $gymName = 'Your Gym';
        $gymDescription = 'Welcome to our gym! Edit this description to tell people about your facility.';
        $gymLogo = '';
        $isBase64Logo = false;
        $imgType = 'png';
    }
    ?>

    // Function to load gym address
    function loadGymAddress() {
        console.log('Loading gym address...');
        const addressLink = document.getElementById('addressLink');
        const copyBtn = document.getElementById('copyAddressBtn');
        const gymAddress = <?php echo json_encode($gymAddress); ?>;

        if (gymAddress && gymAddress !== 'No address available') {

            console.log('Address found:', gymAddress);
            const encodedAddress = encodeURIComponent(gymAddress);
            addressLink.textContent = gymAddress;
            addressLink.href = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
            copyBtn.onclick = () => copyToClipboard(gymAddress);
            copyBtn.style.display = 'inline-block';
        } else {
            console.log('No address found');
            addressLink.textContent = 'No address available';
            copyBtn.style.display = 'none';
        }
    }

    // --- New function to load GCash details from Firebase ---
    function loadGcashDetails() {
        const gymId = <?php echo json_encode($_SESSION['gym_data']['profile']['gymId'] ?? $_SESSION['user_id'] ?? ''); ?>;
        if (!gymId) {
            console.error('Could not find Gym ID to fetch GCash details.');
            document.getElementById('gcashNameDisplay').textContent = 'Error';
            document.getElementById('gcashNumberDisplay').textContent = 'Error';
            return;
        }

        const gcashRef = database.ref(`gyms/${gymId}/gymInfo/paymentInfo`);
        gcashRef.on('value', (snapshot) => {
            const nameDisplay = document.getElementById('gcashNameDisplay');
            const numberDisplay = document.getElementById('gcashNumberDisplay');
            
            if (snapshot.exists()) {
                const paymentInfo = snapshot.val();
                nameDisplay.textContent = paymentInfo.gcashAccountName || 'Not Set';
                numberDisplay.textContent = paymentInfo.gcashAccountNumber || 'Not Set';
            } else {
                nameDisplay.textContent = 'Not Set';
                numberDisplay.textContent = 'Not Set';
            }
        }, (error) => {
            console.error("Error fetching GCash details:", error);
            document.getElementById('gcashNameDisplay').textContent = 'Error loading';
            document.getElementById('gcashNumberDisplay').textContent = 'Error loading';
        });
    }

    // Initialize gym info from PHP
    const gymData = {
        name: <?php echo json_encode($gymName); ?>,
        description: <?php echo json_encode($gymDescription); ?>,
        gcashName: <?php echo json_encode($gcashAccountName); ?>,
        gcashNumber: <?php echo json_encode($gcashAccountNumber); ?>
    };

    function updateGymInfo() {
        const userId = <?php echo json_encode($_SESSION['user_id'] ?? ''); ?>;
        const gymId = <?php echo json_encode($_SESSION['gym_data']['profile']['gymId'] ?? $_SESSION['user_id'] ?? ''); ?>;

        if (!userId || !gymId) {
            console.error('User ID or Gym ID not found');
            return;
        }

        const nameInput = document.getElementById('gymNameInput');
        const descInput = document.getElementById('gymDescriptionInput');
        const displayMode = document.getElementById('displayMode');
        const editMode = document.getElementById('editMode');
        const nameDisplay = document.getElementById('gymNameDisplay');
        const descDisplay = document.getElementById('gymDescriptionDisplay');

        // Show loading state
        const saveBtn = document.getElementById('saveGymInfoBtn');
        const originalText = saveBtn.innerHTML;
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

        // Update Firebase - try multiple paths to ensure it saves
        const updates = {};
        updates[`gyms/${gymId}/name`] = nameInput.value;
        updates[`gyms/${gymId}/description`] = descInput.value;
        updates[`gyms/${gymId}/gymInfo/name`] = nameInput.value;
        updates[`gyms/${gymId}/gymInfo/description`] = descInput.value;

        console.log('Updating gym info with:', updates);

        database.ref().update(updates)
            .then(() => {
                console.log('Gym info updated successfully in Firebase');
                // Update display
                nameDisplay.textContent = nameInput.value;
                descDisplay.textContent = descInput.value;
                displayMode.style.display = 'block';
                editMode.style.display = 'none';
                
                // Show success message
                const successMsg = document.createElement('span');
                successMsg.textContent = 'Gym info updated successfully';
                successMsg.style.color = 'green';
                successMsg.style.marginLeft = '10px';
                successMsg.style.fontWeight = 'bold';
                document.querySelector('.gym-name-desc').appendChild(successMsg);
                
                // Remove success message after 3 seconds
                setTimeout(() => {
                    if (successMsg.parentNode) {
                        successMsg.remove();
                    }
                }, 3000);
            })
            .catch(error => {
                console.error('Error updating gym info:', error);
                alert('Failed to save changes. Please try again.');
            })
            .finally(() => {
                saveBtn.disabled = false;
                saveBtn.innerHTML = originalText;
            });
    }

    // --- Function to update GCash info ---
    function updateGcashInfo() {
        const gymId = <?php echo json_encode($_SESSION['gym_data']['profile']['gymId'] ?? $_SESSION['user_id'] ?? ''); ?>;
        const newName = document.getElementById('gcashNameInput').value.trim();
        const newNumber = document.getElementById('gcashNumberInput').value.trim();

        const gcashPattern = /^09\d{9}$/;
        if (!newNumber || !newName) {
            alert('GCash name and number cannot be empty.');
            return;
        }
        if (!gcashPattern.test(newNumber)) {
            alert('Please enter a valid 11-digit GCash number starting with 09.');
            return;
        }

        // Show loading state
        const saveBtn = document.getElementById('saveGcashBtn');
        const originalText = saveBtn.innerHTML;
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

        console.log('Gym ID:', gymId);
        console.log('New GCash Name:', newName);
        console.log('New GCash Number:', newNumber);

        // Use the same approach as address update which works
        const updates = {};
        updates[`gyms/${gymId}/gymInfo/paymentInfo/gcashAccountName`] = newName;
        updates[`gyms/${gymId}/gymInfo/paymentInfo/gcashAccountNumber`] = newNumber;
        // Also try alternative paths in case of Firebase rules issues
        updates[`gyms/${gymId}/paymentInfo/gcashAccountName`] = newName;
        updates[`gyms/${gymId}/paymentInfo/gcashAccountNumber`] = newNumber;
        
        console.log('Updating GCash info with:', updates);

        database.ref().update(updates).then(() => {
            console.log('GCash info updated successfully in Firebase');
            document.getElementById('gcashNameDisplay').textContent = newName;
            document.getElementById('gcashNumberDisplay').textContent = newNumber;
            document.getElementById('gcashDisplayMode').style.display = 'block';
            document.getElementById('gcashEditMode').style.display = 'none';
            
            // Show success message
            const successMsg = document.createElement('span');
            successMsg.textContent = 'GCash info updated successfully';
            successMsg.style.color = 'green';
            successMsg.style.marginLeft = '10px';
            successMsg.style.fontWeight = 'bold';
            document.querySelector('.payment-info-container').appendChild(successMsg);
            
            // Remove success message after 3 seconds
            setTimeout(() => {
                if (successMsg.parentNode) {
                    successMsg.remove();
                }
            }, 3000);
        }).catch(error => {
            console.error('Error updating GCash info:', error);
            alert('Failed to save GCash details. Please try again.');
        }).finally(() => {
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalText;
            });
    }

    // Function to update gym address in Firebase
    function updateGymAddress() {
        const userId = <?php echo json_encode($_SESSION['user_id'] ?? ''); ?>;
        const gymId = <?php echo json_encode($_SESSION['gym_data']['profile']['gymId'] ?? $_SESSION['user_id'] ?? ''); ?>;
        const newAddress = document.getElementById('addressInput').value.trim();

        if (!newAddress) {
            alert('Please enter a valid address');
            return;
        }

        // Show loading state
        const saveBtn = document.getElementById('saveAddressBtn');
        const originalText = saveBtn.innerHTML;
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

        // Update Firebase
        const updates = {};
        updates[`gyms/${gymId}/gym_address`] = newAddress;

        database.ref().update(updates)
            .then(() => {
                // Update UI
                document.getElementById('addressDisplay').style.display = 'inline-block';
                document.getElementById('addressEdit').style.display = 'none';
                loadGymAddress(); // Refresh the address display
                
                // Show success message
                const successMsg = document.createElement('span');
                successMsg.textContent = 'Address updated successfully';
                successMsg.style.color = 'green';
                successMsg.style.marginLeft = '10px';
                document.querySelector('.contact-info').appendChild(successMsg);
                
                // Remove success message after 3 seconds
                setTimeout(() => {
                    successMsg.remove();
                }, 3000);
            })
            .catch(error => {
                console.error('Error updating address:', error);
                alert('Failed to update address. Please try again.');
            })
            .finally(() => {
                saveBtn.disabled = false;
                saveBtn.innerHTML = originalText;
            });
    }

    // Call loadGymAddress when the page loads
    document.addEventListener('DOMContentLoaded', () => {
        console.log('DOM loaded, initializing...');
        loadGymAddress();
        loadGcashDetails(); // --- Load GCash details from Firebase ---
        
        // Set up address edit functionality
        const editAddressBtn = document.getElementById('editAddressBtn');
        const saveAddressBtn = document.getElementById('saveAddressBtn');
        const cancelAddressBtn = document.getElementById('cancelAddressBtn');
        
        if (editAddressBtn) {
            editAddressBtn.addEventListener('click', () => {
                document.getElementById('addressDisplay').style.display = 'none';
                document.getElementById('addressEdit').style.display = 'block';
                document.getElementById('addressInput').value = document.getElementById('addressLink').textContent || '';
                document.getElementById('addressInput').focus();
            });
        }
        
        if (saveAddressBtn) {
            saveAddressBtn.addEventListener('click', updateGymAddress);
            document.getElementById('addressInput').addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    updateGymAddress();
                }
            });
        }
        
        if (cancelAddressBtn) {
            cancelAddressBtn.addEventListener('click', () => {
                document.getElementById('addressDisplay').style.display = 'inline-block';
                document.getElementById('addressEdit').style.display = 'none';
            });
        }

        // Setup gym info edit handlers
        const editBtn = document.getElementById('editGymInfoBtn');
        const saveBtn = document.getElementById('saveGymInfoBtn');
        const cancelBtn = document.getElementById('cancelGymInfoBtn');
        const displayMode = document.getElementById('displayMode');
        const editMode = document.getElementById('editMode');

        editBtn.addEventListener('click', () => {
            document.getElementById('gymNameInput').value = document.getElementById('gymNameDisplay').textContent;
            document.getElementById('gymDescriptionInput').value = document.getElementById('gymDescriptionDisplay').textContent;
            displayMode.style.display = 'none';
            editMode.style.display = 'block';
            document.getElementById('gymNameInput').focus();
        });

        saveBtn.addEventListener('click', updateGymInfo);

        cancelBtn.addEventListener('click', () => {
            displayMode.style.display = 'block';
            editMode.style.display = 'none';
        });

        // --- Setup GCash info edit handlers ---
        const editGcashBtn = document.getElementById('editGcashBtn');
        const saveGcashBtn = document.getElementById('saveGcashBtn');
        const cancelGcashBtn = document.getElementById('cancelGcashBtn');
        const gcashDisplayMode = document.getElementById('gcashDisplayMode');
        const gcashEditMode = document.getElementById('gcashEditMode');

        editGcashBtn.addEventListener('click', () => {
            const currentName = document.getElementById('gcashNameDisplay').textContent;
            const currentNumber = document.getElementById('gcashNumberDisplay').textContent;
            document.getElementById('gcashNameInput').value = currentName !== 'Not Set' && currentName !== 'Loading...' ? currentName : '';
            document.getElementById('gcashNumberInput').value = currentNumber !== 'Not Set' && currentNumber !== 'Loading...' ? currentNumber : '';
            gcashDisplayMode.style.display = 'none';
            gcashEditMode.style.display = 'block';
        });

        saveGcashBtn.addEventListener('click', updateGcashInfo);

        cancelGcashBtn.addEventListener('click', () => {
            gcashDisplayMode.style.display = 'block';
            gcashEditMode.style.display = 'none';
        });
    });

    // Function to copy text to clipboard
    function copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            // Show tooltip or feedback
            const tooltip = document.createElement('div');
            tooltip.textContent = 'Copied!';
            tooltip.style.position = 'fixed';
            tooltip.style.background = '#333';
            tooltip.style.color = 'white';
            tooltip.style.padding = '5px 10px';
            tooltip.style.borderRadius = '4px';
            tooltip.style.zIndex = '1000';
            tooltip.style.top = (event.clientY + 10) + 'px';
            tooltip.style.left = (event.clientX + 10) + 'px';
            document.body.appendChild(tooltip);
            
            // Remove tooltip after 2 seconds
            setTimeout(() => {
                document.body.removeChild(tooltip);
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
        });
    }
    </script>
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
            color: #222;
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

        /* Removed duplicate sidebar styles */

        .main-content {
            margin-left: 250px;
            flex: 1;
            display: flex;
            flex-direction: column;
            min-height: 100vh;
            background-color: #fff;
            overflow-y: auto;
        }

        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px 25px;
            background-color: #fff;
            border-bottom: 4px solid #FFD700;
        }

        .header h1 {
            margin: 0;
            font-size: 2.5em;
            font-weight: 700;
            font-family: Arial Black, Arial, sans-serif;
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
            cursor: pointer;
            transition: background-color 0.3s ease;
        }

        .logout-btn:hover {
            background-color: #FFD700;
            color: black;
        }

        .logout-btn img {
            width: 18px;
            height: 18px;
            object-fit: contain;
        }

        .content-area {
            flex-grow: 1;
            padding: 25px 40px 40px 40px;
        }

        footer {
            background-color: #000;
            color: #FFCC00;
            text-align: center;
            padding: 15px;
            border-top: 6px solid #FFCC00;
            font-weight: bold;
            font-size: 14px;
        }

        /* Gym info area styles */

        .gym-info-header {
            display: flex;
            align-items: center;
            gap: 15px;
            margin-bottom: 15px;
            flex-wrap: wrap;
        }

        .gym-main-image {
            width: 180px;
            height: 180px;
            object-fit: cover;
            border-radius: 12px;
            cursor: pointer;
            border: 4px solid #FFD700;
            box-shadow: 0 4px 8px rgba(0,0,0,0.15);
            flex-shrink: 0;
        }

        .gym-name-desc {
            flex-grow: 1;
            max-width: calc(100% - 200px);
        }

        #gymNameDisplay {
            font-size: 2em;
            font-weight: 900;
            color: #222;
            margin-bottom: 6px;
        }

        #gymDescriptionDisplay {
            font-size: 1.1em;
            line-height: 1.5em;
            color: #444;
            white-space: pre-line;
            border: 1px solid #ccc;
            border-radius: 6px;
            padding: 10px;
            background-color: #fafafa;
            min-height: 90px;
        }

        .edit-buttons {
            margin-top: 8px;
            display: flex;
            gap: 10px;
        }

        button.edit-btn, button.save-btn, button.cancel-btn {
            background-color: #FFD700;
            border: none;
            border-radius: 25px;
            font-weight: bold;
            font-size: 14px;
            padding: 6px 18px;
            cursor: pointer;
            transition: background-color 0.3s;
        }

        button.edit-btn:hover, button.save-btn:hover, button.cancel-btn:hover {
            background-color: #FFB800;
        }

        /* Editable inputs - hidden by default */

        #gymNameInput, #gymDescriptionInput {
            display: none;
            width: 100%;
            font-size: 1.1em;
            line-height: 1.5em;
            padding: 10px;
            border-radius: 6px;
            border: 2px solid #FFD700;
            min-height: 100px;
            font-family: Arial, sans-serif;
            resize: vertical;
        }

        #gymDescriptionInput {
            font-size: 1em;
            height: 100px;
        }

        /* Gallery styles */
        .gallery {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 16px;
            margin-top: 16px;
        }
        
        .gallery-img {
            width: 100%;
            height: 200px;
            object-fit: cover;
            border-radius: 8px;
            cursor: pointer;
            transition: transform 0.3s ease;
            border: 2px solid #e0e0e0;
        }
        
        .gallery-img:hover {
            transform: scale(1.03);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        
        .upload-btn-wrapper {
            position: relative;
            overflow: hidden;
            display: inline-block;
        }
        
        .upload-btn {
            background-color: #FFD700;
            color: #000;
            padding: 10px 20px;
            border: none;
            border-radius: 25px;
            font-weight: bold;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 14px;
            transition: all 0.3s ease;
        }
        
        .upload-btn:hover {
            background-color: #FFC000;
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }
        
        .progress-bar {
            width: 100%;
            height: 6px;
            background-color: #f0f0f0;
            border-radius: 3px;
            overflow: hidden;
            margin-bottom: 8px;
        }
        
        .progress {
            height: 100%;
            background-color: #4CAF50;
            width: 0%;
            transition: width 0.3s ease;
        }
        
        .upload-status {
            font-size: 13px;
            color: #555;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        #uploadFileName {
            font-weight: bold;
            max-width: 70%;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        
        #uploadPercent {
            font-weight: bold;
            color: #1a73e8;
        }
        
        /* Modal styles */
        .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.9);
            z-index: 1000;
            justify-content: center;
            align-items: center;
        }
        
        .modal img {
            max-width: 90%;
            max-height: 90%;
            object-fit: contain;
        }
        
        .close-btn {
            position: absolute;
            top: 20px;
            right: 30px;
            color: white;
            font-size: 40px;
            font-weight: bold;
            cursor: pointer;
            transition: color 0.3s;
        }
        
        .close-btn:hover {
            color: #FFD700;
            resize: vertical;
            font-weight: normal;
            white-space: normal;
        }

        /* Gallery thumbnails */

        .gallery {
            margin-top: 10px;
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }

        .gallery img {
            width: 80px;
            height: 80px;
            object-fit: cover;
            border-radius: 6px;
            cursor: pointer;
            border: 3px solid transparent;
            transition: border-color 0.3s;
        }

        .gallery img:hover {
            border-color: #FFD700;
        }


        /* Modal gallery overlay */

        .modal {
            position: fixed;
            top:0;
            left:0;
            width: 100vw;
            height: 100vh;
            background-color: rgba(0,0,0,0.85);
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 9999;
        }

        .modal img {
            max-width: 90vw;
            max-height: 90vh;
            border-radius: 12px;
            box-shadow: 0 0 15px #FFD700;
        }

        .modal .close-btn {
            position: absolute;
            top: 20px;
            right: 30px;
            font-size: 2.5em;
            font-weight: 900;
            color: #FFD700;
            cursor: pointer;
            user-select: none;
        }

        /* Address and social media container flex */

        .contact-social-container {
            display: flex;
            align-items: center;
            gap: 40px;
            margin: 20px 0 30px;
            font-size: 1.1em;
            color: #222;
            flex-wrap: wrap;
        }

        .contact-info, .social-links {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .contact-info a, .social-links a {
            color: #000;
            text-decoration: none;
            font-weight: bold;
            border-bottom: 2px solid transparent;
            transition: border-color 0.3s;
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 1em;
        }

        .contact-info a:hover, .social-links a:hover {
            border-color: #FFD700;
            color: #FFD700;
        }

        /* Social icons SVG styling */

        .social-icon {
            width: 22px;
            height: 22px;
            fill: #000;
            transition: fill 0.3s;
        }
        
        .social-links a:hover .social-icon {
            fill: #FFD700;
        }

        /* Schedule table */
        table.schedule-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            font-size: 1em;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            border-radius: 8px;
            overflow: hidden;
        }

        table.schedule-table th, 
        table.schedule-table td {
            border: 1px solid #e0e0e0;
            padding: 12px 15px;
            text-align: left;
        }
        
        table.schedule-table thead tr {
            background-color: #FFD700;
            color: #000;
            font-weight: 700;
        }
        
        table.schedule-table tbody tr {
            border-bottom: 1px solid #e0e0e0;
        }
        
        table.schedule-table tbody tr:nth-of-type(even) {
            background-color: #f9f9f9;
        }
        
        table.schedule-table tbody tr:last-of-type {
            border-bottom: 2px solid #FFD700;
        }
        
        table.schedule-table tbody tr:hover {
            background-color: #f1f1f1;
        }
        
        table.schedule-table .actions {
            white-space: nowrap;
            text-align: center;
        }
        
        table.schedule-table .btn {
            padding: 5px 10px;
            margin: 0 2px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.9em;
            transition: all 0.2s;
        }
        
        table.schedule-table .btn-primary {
            background-color: #3498db;
            color: white;
        }
        
        table.schedule-table .btn-danger {
            background-color: #e74c3c;
            color: white;
        }
        
        table.schedule-table .btn:hover {
            opacity: 0.9;
            transform: translateY(-1px);
        }
        

        .schedule-table th {
            padding: 12px 15px;
            text-align: left;
            background-color: #FFD700;
            color: #000;
            font-weight: 700;
            border: none;
            text-transform: uppercase;
            font-size: 0.9em;
            letter-spacing: 0.5px;
        }
        
        .schedule-table td {
            padding: 12px 15px;
            border-bottom: 1px solid #e0e0e0;
            vertical-align: middle;
        }
        
        .schedule-table tbody tr:last-child td {
            border-bottom: none;
        }
        
        .schedule-table tbody tr:hover {
            background-color: #f8f9fa;
        }
        
        .schedule-table .actions {
            white-space: nowrap;
        }
        
        .schedule-table .btn {
            padding: 6px 12px;
            font-size: 0.85em;
            border-radius: 4px;
            margin-right: 5px;
            transition: all 0.3s ease;
        }
        
        .schedule-table .btn:last-child {
            margin-right: 0;
        }
        
        .schedule-table .btn-primary {
            background-color: #3498db;
            border-color: #3498db;
        }
        
        .schedule-table .btn-danger {
            background-color: #e74c3c;
            border-color: #e74c3c;
        }
        
        .schedule-table .btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }

        table.schedule-table button {
            padding: 4px 10px;
            border-radius: 20px;
            border: none;
            background-color: #FFD700;
            cursor: pointer;
            font-weight: 600;
            transition: background-color 0.3s;
        }

        table.schedule-table button:hover {
            background-color: #FFB800;
        }

        /* Editable schedule inputs - hidden initially */

        .schedule-edit-input {
            width: 90%;
            padding: 4px 6px;
            border-radius: 6px;
            border: 1.8px solid #FFD700;
            font-size: 1em;
            font-weight: normal;
            font-family: Arial, sans-serif;
            box-sizing: border-box;
        }

        .payment-info-container {
            margin: 20px 0;
            font-size: 1.1em;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .payment-info-container strong {
            color: #222;
        }

        .payment-info-container .details span {
            font-weight: bold;
            color: #000;
        }

        .payment-info-container input {
            padding: 4px 8px;
            border-radius: 4px;
            border: 1px solid #ccc;
            margin-right: 10px;
        }

    </style>
</head>
<body>
<link rel="icon" type="image/png" href="../elements/logo web.png">
    <div class="container">
        <!-- Sidebar -->
        <?php echo $sidebar; ?>

        <!-- Main Content -->
        <main class="main-content" role="main" aria-label="Gym main content">
            <header class="header">
            <link rel="icon" type="image/png" href="../elements/logo web.png">
                <h1><span id="h11">YOUR</span> <span id="h12">GYM</span></h1>
                <a class="logout-btn" href="logout.php" aria-label="Log out">
                    LOG OUT
                    <img src="../elements/PROFILE.png" alt="User Icon" />
                </a>
            </header>

            <div class="content-area" tabindex="0">
                <!-- Gym Info Header with image, name and description -->

                <div class="gym-info-header">
                    <?php if ($isBase64Logo): ?>
                    <img src="data:image/<?php echo $imgType; ?>;base64,<?php echo $gymLogo; ?>" 
                         alt="Gym Logo" 
                         id="gymMainImage" 
                         class="gym-main-image" 
                         title="Click to open gallery" 
                         tabindex="0" 
                         onerror="this.onerror=null; this.src='../elements/default-gym-logo.png';" />
                    <?php elseif ($gymLogo): ?>
                    <img src="<?php echo htmlspecialchars($gymLogo); ?>" 
                         alt="Gym Logo" 
                         id="gymMainImage" 
                         class="gym-main-image" 
                         title="Click to open gallery" 
                         tabindex="0" 
                         onerror="this.onerror=null; this.src='../elements/default-gym-logo.png';" />
                    <?php else: ?>
                    <img src="../elements/gym-image.png" 
                         alt="Default Gym Logo" 
                         id="gymMainImage" 
                         class="gym-main-image" 
                         title="Click to open gallery" 
                         tabindex="0" />
                    <?php endif; ?>
                    <div class="gym-name-desc">
                        <!-- Display mode -->
                        <div id="displayMode">
                            <div id="gymNameDisplay"><?php echo htmlspecialchars($gymName); ?></div>
                            <div id="gymDescriptionDisplay" aria-label="Gym description">
                                <?php echo htmlspecialchars($gymDescription); ?>
                            </div>
                            <div class="edit-buttons">
                                <button class="edit-btn" id="editGymInfoBtn" aria-label="Edit gym name and description">Edit</button>
                            </div>
                        </div>

                        <!-- Edit mode -->
                        <div id="editMode" style="display:none;">
                            <input type="text" id="gymNameInput" aria-label="Edit gym name" />
                            <textarea id="gymDescriptionInput" rows="4" aria-label="Edit gym description" style="width: 100%; display: block;"></textarea>
                            <div class="edit-buttons">
                                <button class="save-btn" id="saveGymInfoBtn" aria-label="Save gym name and description">Save</button>
                                <button class="cancel-btn" id="cancelGymInfoBtn" aria-label="Cancel editing gym info">Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Contact Info & Social Media -->

                <div class="contact-social-container" aria-label="Contact information and social media links">
                    <div class="contact-info">
                        <strong>Address:</strong>
                        <div id="addressDisplay" style="display: inline-block;">
                            <a href="#" 
                                id="addressLink"
                                target="_blank" 
                                rel="noopener noreferrer" 
                                class="contact-link"
                                title="Open in Google Maps">
                                Loading address...
                            </a>
                            <span class="copy-btn" title="Copy address" id="copyAddressBtn">
                                
                            </span>
                            <button id="editAddressBtn" class="copy-btn" title="Edit address" style="background: none; border: none; cursor: pointer; margin-left: 5px;">
                                <i class="far fa-edit"></i>
                            </button>
                        </div>
                        <div id="addressEdit" style="display: none;">
                            <input type="text" id="addressInput" class="form-control" style="display: inline-block; width: 300px; margin-right: 5px;">
                            <button id="saveAddressBtn" class="btn btn-sm btn-primary" style="padding: 2px 8px; margin-right: 5px;">Save</button>
                            <button id="cancelAddressBtn" class="btn btn-sm btn-secondary" style="padding: 2px 8px;">Cancel</button>
                        </div>
                    </div>
                    <div class="social-links" aria-label="Social media links">
                        
                    </div>
                </div>

              <!-- GCash Payment Information -->
              <div class="payment-info-container" aria-label="GCash payment information">
                    <strong>GCash Info:</strong>
                    <div id="gcashDisplayMode">
                        <div style="margin-top: 5px;">
                            <span class="details">
                                Account Name: <span id="gcashNameDisplay"></span><br>
                                Account Number: <span id="gcashNumberDisplay"></span>
                            </span>
                        </div>
                        <button id="editGcashBtn" class="copy-btn" title="Edit GCash Info" style="background: none; border: none; cursor: pointer; margin-left: 5px;">
                            <i class="far fa-edit"></i>
                        </button>
                    </div>
                    <div id="gcashEditMode" style="display: none;">
                        <input type="text" id="gcashNameInput" placeholder="Account Name">
                        <input type="tel" id="gcashNumberInput" placeholder="09XXXXXXXXX" maxlength="11" oninput="this.value = this.value.replace(/[^0-9]/g, '');">
                        <button id="saveGcashBtn" class="btn btn-sm btn-primary" style="padding: 2px 8px; margin-right: 5px;">Save</button>
                        <button id="cancelGcashBtn" class="btn btn-sm btn-secondary" style="padding: 2px 8px;">Cancel</button>
                    </div>
                </div>


                <!-- Schedule Section -->
                <section aria-label="Gym class schedule" style="margin-top: 30px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <h2 style="color:black; font-weight:bold; font-size:1.6em; margin: 0;">Class Schedule</h2>
                        <button id="addScheduleBtn" class="btn-primary">
                            <i class="fas fa-plus"></i> Add Class
                        </button>
                    </div>

                    <!-- Add/Edit Form (Hidden by default) -->
                    <div id="scheduleForm" style="display: none; background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #dee2e6;">
                        <form id="scheduleForm" class="schedule-form">
                            <div class="form-header">
                                <h3 id="formTitle">Add New Class</h3>
                                <button type="button" id="closeFormBtn" class="close-btn" aria-label="Close form">&times;</button>
                            </div>
                            <div class="form-group">
                                <label for="classDay">Day:</label>
                                <select id="classDay" class="form-select">
                                    <option value="Monday">Monday</option>
                                    <option value="Tuesday">Tuesday</option>
                                    <option value="Wednesday">Wednesday</option>
                                    <option value="Thursday">Thursday</option>
                                    <option value="Friday">Friday</option>
                                    <option value="Saturday">Saturday</option>
                                    <option value="Sunday">Sunday</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="classType">Class Type:</label>
                                <select id="classType" class="form-select">
                                    <?php foreach ($classTypesList as $classType): ?>
                                        <option value="<?php echo htmlspecialchars($classType); ?>"><?php echo htmlspecialchars($classType); ?></option>
                                    <?php endforeach; ?>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="classStartTime">Time:</label>
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    <input type="time" id="classStartTime" class="form-input" style="flex: 1;" required>
                                    <span style="font-weight: bold; padding: 0 5px;">to</span>
                                    <input type="time" id="classEndTime" class="form-input" style="flex: 1;" required>
                                </div>
                                <small style="color: #777; margin-top: 5px; display: block;">Set the start and end time for the class.</small>
                            </div>
                            <div class="form-actions">
                                <button type="button" id="saveScheduleBtn" class="btn-primary">
                                    <i class="fas fa-save"></i> Save
                                </button>
                                <button type="button" id="cancelScheduleBtn" class="btn-secondary">
                                    <i class="fas fa-times"></i> Cancel
                                </button>
                            </div>
                        </form>
                    </div>

                    <!-- Schedule Table -->
                    <div class="table-responsive">
                        <table class="schedule-table" id="scheduleTable">
                            <thead>
                                <tr>
                                    <th>Day</th>
                                    <th>Class</th>
                                    <th>Time</th>
                                    <th style="width: 180px;">Actions</th>
                                </tr>
                            </thead>
                            <tbody id="scheduleTableBody">
                                <tr>
                                    <td colspan="4" class="text-center py-4">Loading schedule...</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>

                <style>
                .schedule-table {
                    width: 100%;
                    border-collapse: separate;
                    border-spacing: 0;
                    margin: 25px 0;
                    font-size: 0.95em;
                    min-width: 100%;
                    box-shadow: 0 2px 15px rgba(0, 0, 0, 0.1);
                    border-radius: 8px;
                    overflow: hidden;
                }
                
                .schedule-table thead tr {
                    background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
                    color: #000;
                    text-align: left;
                    font-weight: 700;
                    text-transform: uppercase;
                    font-size: 0.85em;
                    letter-spacing: 0.5px;
                }
                
                .schedule-table th,
                .schedule-table td {
                    padding: 15px 20px;
                    border: none;
                    border-bottom: 1px solid rgba(0,0,0,0.05);
                }
                
                .schedule-table th:first-child,
                .schedule-table td:first-child {
                    padding-left: 25px;
                }
                
                .schedule-table th:last-child,
                .schedule-table td:last-child {
                    padding-right: 25px;
                }
                
                .schedule-table tbody tr {
                    transition: all 0.2s ease;
                    background-color: #fff;
                }
                
                .schedule-table tbody tr:nth-child(even) {
                    background-color: #f8f9fa;
                }
                
                .schedule-table tbody tr:hover {
                    background-color: #f1f8ff;
                    transform: translateX(5px);
                    box-shadow: 0 5px 15px rgba(0,0,0,0.1);
                }
                
                .schedule-table tbody tr:last-child td {
                    border-bottom: none;
                }
                
                .schedule-table tbody tr td {
                    color: #333;
                    font-weight: 400;
                    vertical-align: middle;
                }
                
                .schedule-table tbody tr td:first-child {
                    font-weight: 600;
                    color: #2c3e50;
                }
                
                .action-buttons {
                    display: flex;
                    gap: 8px;
                }
                
                .action-buttons button {
                    padding: 6px 12px;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 0.85em;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s ease;
                }
                
                .btn-edit {
                    background-color: #3498db;
                    color: white;
                }
                
                .btn-delete {
                    background-color: #e74c3c;
                    color: white;
                }
                
                .btn-edit:hover {
                    background-color: #2980b9;
                    transform: translateY(-1px);
                }
                
                .btn-delete:hover {
                    background-color: #c0392b;
                    transform: translateY(-1px);
                }
                
                .btn-edit i,
                .btn-delete i {
                    margin-right: 4px;
                }
                
                /* Schedule Form Styles */
                .schedule-form {
                    background: #ffffff;
                    padding: 2.5rem;
                    border-radius: 12px;
                    box-shadow: 0 4px 25px rgba(0, 0, 0, 0.06);
                    margin: 2rem 0 3rem;
                    border: 1px solid rgba(0, 0, 0, 0.04);
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    position: relative;
                    overflow: hidden;
                }
                
                .schedule-form::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 4px;
                    height: 100%;
                    background: linear-gradient(to bottom, #3498db, #2ecc71);
                    transition: all 0.4s ease;
                }
                
                .schedule-form:hover {
                    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1);
                    transform: translateY(-3px);
                    border-color: rgba(52, 152, 219, 0.1);
                }
                
                .schedule-form:hover::before {
                    width: 6px;
                }
                
                .form-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 2rem;
                    padding-bottom: 1rem;
                    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
                    position: relative;
                }
                
                .form-header::after {
                    content: '';
                    position: absolute;
                    bottom: -1px;
                    left: 0;
                    width: 60px;
                    height: 2px;
                    background: linear-gradient(90deg, #3498db, #2ecc71);
                }
                
                .form-header h3 {
                    margin: 0;
                    color: #2c3e50;
                    font-size: 1.5rem;
                    font-weight: 700;
                    letter-spacing: -0.3px;
                }
                
                .close-btn {
                    background: none;
                    border: none;
                    font-size: 1.8em;
                    cursor: pointer;
                    color: #95a5a6;
                    transition: all 0.2s ease;
                    width: 36px;
                    height: 36px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                    line-height: 1;
                    padding: 0;
                }
                
                .close-btn:hover {
                    background-color: #f8f9fa;
                    color: #e74c3c;
                    transform: rotate(90deg);
                }
                
                .form-group {
                    margin-bottom: 1.6rem;
                    position: relative;
                }
                
                .form-group:last-child {
                    margin-bottom: 0;
                }
                
                .form-group label {
                    display: block;
                    margin-bottom: 0.6rem;
                    font-weight: 600;
                    color: #2c3e50;
                    font-size: 0.95rem;
                    transition: all 0.3s ease;
                }
                
                .form-select,
                .form-input {
                    width: 100%;
                    padding: 0.9rem 1.2rem;
                    border: 1px solid #e0e0e0;
                    border-radius: 8px;
                    font-size: 1rem;
                    color: #2c3e50;
                    background-color: #fff;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
                    -webkit-appearance: none;
                    -moz-appearance: none;
                    appearance: none;
                }
                
                .form-select {
                    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%237f8c8d' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14L2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E");
                    background-repeat: no-repeat;
                    background-position: right 15px center;
                    background-size: 12px;
                    padding-right: 40px;
                }
                
                .form-select:focus,
                .form-input:focus {
                    outline: none;
                    border-color: #3498db;
                    box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.2);
                }
                
                .form-actions {
                    display: flex;
                    gap: 1rem;
                    margin-top: 2.5rem;
                    justify-content: flex-end;
                    padding-top: 1.5rem;
                    border-top: 1px solid rgba(0, 0, 0, 0.05);
                }
                
                .btn-primary,
                .btn-secondary {
                    padding: 0.85rem 1.8rem;
                    border: none;
                    border-radius: 8px;
                    font-weight: 600;
                    font-size: 0.95rem;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
                    min-width: 120px;
                    text-align: center;
                }
                
                .btn-primary {
                    background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
                    color: white;
                }
                
                .btn-primary:hover {
                    background: linear-gradient(135deg, #2980b9 0%, #3498db 100%);
                    transform: translateY(-2px);
                    box-shadow: 0 4px 15px rgba(41, 128, 185, 0.3);
                }
                
                .btn-primary:active {
                    transform: translateY(0);
                }
                
                .btn-secondary {
                    background: #f8f9fa;
                    color: #2c3e50;
                    border: 1px solid #e0e0e0;
                }
                
                .btn-secondary:hover {
                    background: #e9ecef;
                    transform: translateY(-2px);
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
                }
                
                .btn-secondary:active {
                    transform: translateY(0);
                }
                
                .btn-primary i,
                .btn-secondary i {
                    margin-right: 8px;
                    font-size: 0.9em;
                }
                
                /* Responsive adjustments */
                @media (max-width: 768px) {
                    .schedule-form {
                        padding: 1.8rem 1.5rem;
                        margin: 1.5rem 0 2.5rem;
                    }
                    
                    .form-actions {
                        flex-direction: column;
                        gap: 0.8rem;
                        margin-top: 2rem;
                    }
                    
                    .btn-primary,
                    .btn-secondary {
                        width: 100%;
                        padding: 0.9rem 1.5rem;
                    }
                }


                .edit-schedule-btn, 
                .save-schedule-btn,
                .cancel-schedule-btn {
                    padding: 5px 10px;
                    margin: 0 2px;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 0.9em;
                    transition: all 0.3s;
                }
                
                .edit-schedule-btn {
                    background-color: #4CAF50;
                    color: white;
                }
                
                .save-schedule-btn {
                    background-color: #2196F3;
                    color: white;
                }
                
                .cancel-schedule-btn {
                    background-color: #f44336;
                    color: white;
                }
                
                .edit-schedule-btn:hover {
                    background-color: #45a049;
                }
                
                .save-schedule-btn:hover {
                    background-color: #0b7dda;
                }
                
                .cancel-schedule-btn:hover {
                    background-color: #d32f2f;
                }
                
                .schedule-input {
                    width: 100%;
                    padding: 5px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    font-size: 0.95em;
                }
                
                .actions {
                    white-space: nowrap;
                }
                </style>

            </div>

            <footer>
                &copy; 2025 XPASYO. All rights reserved.
            </footer>
        </main>
    </div>

    <!-- Modal for gallery images -->
    <div class="modal" id="galleryModal" aria-hidden="true" aria-label="Image gallery modal" role="dialog">
        <span class="close-btn" id="modalCloseBtn" tabindex="0" aria-label="Close gallery modal">&times;</span>
        <img src="" alt="Enlarged gym image" id="modalImage" />
    </div>
    
    <script>
    document.addEventListener('DOMContentLoaded', function() {
        const galleryContainer = document.getElementById('galleryContainer');
        const uploadBtn = document.querySelector('.upload-btn');
        const fileInput = document.getElementById('galleryUpload');
        const modal = document.getElementById('galleryModal');
        const modalImg = document.getElementById('modalImage');
        
        // Load existing gallery images
        loadGalleryImages();
        
        // Set up the upload button
        uploadBtn.addEventListener('click', function() {
            fileInput.click();
        });
        
        // Handle file selection
        fileInput.addEventListener('change', handleFileUpload);
        
        // Close modal when clicking the close button
        document.getElementById('modalCloseBtn').addEventListener('click', closeModal);
        
        // Close modal when clicking outside the image
        modal.addEventListener('click', function(event) {
            if (event.target === modal) {
                closeModal();
            }
        });
        
        // Close modal with Escape key
        document.addEventListener('keydown', function(event) {
            if (event.key === 'Escape') {
                closeModal();
            }
        });
        
        function loadGalleryImages() {
            // Get images from local storage
            const galleryData = JSON.parse(localStorage.getItem('gymGallery') || '[]');
            
            galleryContainer.innerHTML = '';
            
            if (galleryData.length === 0) {
                galleryContainer.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">No images uploaded yet. Click \'Upload Image\' to add photos.</p>';
                return;
            }
            
            // Sort by timestamp (newest first)
            galleryData.sort((a, b) => b.timestamp - a.timestamp);
            
            galleryData.forEach((image, index) => {
                createImageElement(image.data, image.name, index);
            });
        }
        
        function createImageElement(imageData, imageName, imageId) {
            // Remove the 'no images' message if it exists
            if (galleryContainer.querySelector('p')) {
                galleryContainer.innerHTML = '';
            }
            
            const imgWrapper = document.createElement('div');
            imgWrapper.className = 'gallery-item';
            imgWrapper.dataset.id = imageId;
            
            const img = document.createElement('img');
            img.src = imageData;
            img.alt = imageName || 'Gym image';
            img.className = 'gallery-img';
            img.tabIndex = 0;
            
            // Add click handler to open modal
            img.addEventListener('click', () => openModal(imageData));
            
            // Add delete button
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.innerHTML = '&times;';
            deleteBtn.title = 'Delete image';
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                if (confirm('Are you sure you want to delete this image?')) {
                    deleteImage(imageId);
                }
            };
            
            imgWrapper.appendChild(img);
            imgWrapper.appendChild(deleteBtn);
            galleryContainer.appendChild(imgWrapper);
        }
        
        function deleteImage(imageId) {
            try {
                // Get current gallery data
                const galleryData = JSON.parse(localStorage.getItem('gymGallery') || '[]');
                
                // Remove the image
                galleryData.splice(imageId, 1);
                
                // Save back to local storage
                localStorage.setItem('gymGallery', JSON.stringify(galleryData));
                
                // Reload gallery
                loadGalleryImages();
                
            } catch (error) {
                console.error('Error deleting image:', error);
                alert('Error deleting image. Please try again.');
            }
        }
        
        function handleFileUpload(e) {
            const file = e.target.files[0];
            if (!file) return;
            
            // Validate file type and size (max 2MB)
            if (!file.type.match('image.*')) {
                alert('Please select an image file (JPEG, PNG, GIF)');
                return;
            }
            
            if (file.size > 2 * 1024 * 1024) { // 2MB max
                alert('Image size should be less than 2MB');
                return;
            }
            
            // Show upload progress
            const progressDiv = document.getElementById('uploadProgress');
            const progressBar = document.querySelector('.progress');
            const uploadFileName = document.getElementById('uploadFileName');
            const uploadPercent = document.getElementById('uploadPercent');
            
            progressDiv.style.display = 'block';
            uploadFileName.textContent = file.name;
            progressBar.style.width = '0%';
            uploadPercent.textContent = '0%';
            
            const reader = new FileReader();
            
            reader.onload = function(e) {
                // Simulate progress
                let progress = 0;
                const interval = setInterval(() => {
                    progress += 20;
                    if (progress > 100) progress = 100;
                    
                    progressBar.style.width = `${progress}%`;
                    uploadPercent.textContent = `${progress}%`;
                    
                    if (progress === 100) {
                        clearInterval(interval);
                        
                        // Get current gallery data
                        const galleryData = JSON.parse(localStorage.getItem('gymGallery') || '[]');
                        
                        // Add new image
                        galleryData.push({
                            name: file.name,
                            data: e.target.result,
                            timestamp: Date.now()
                        });
                        
                        // Save to local storage
                        localStorage.setItem('gymGallery', JSON.stringify(galleryData));
                        
                        // Reset the file input and hide progress
                        e.target.value = '';
                        progressDiv.style.display = 'none';
                        
                        // Reload gallery to show new image
                        loadGalleryImages();
                        
                        // Show the new image in the modal
                        if (e && e.target && e.target.result) {
                            openModal(e.target.result);
                        } else {
                            console.error('Invalid file reader result:', e);
                            alert('Error: Could not read the image file.');
                        }
                    }
                }, 50);
            };
            
            reader.onerror = function() {
                alert('Error reading file. Please try again.');
                progressDiv.style.display = 'none';
            };
            
            // Start reading the file
            reader.readAsDataURL(file);
        }
        
        // Open image in modal
        function openModal(src) {
            modal.style.display = 'flex';
            modalImg.src = src;
            document.body.style.overflow = 'hidden';
        }
        
        // Close modal
        function closeModal() {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    });
</script>
</body>
</html>

<script>
    // Initialize Schedule Manager with Firebase
    function initScheduleManager() {
        console.log('Initializing schedule manager...');
        
        // Get DOM elements
        const addScheduleBtn = document.getElementById('addScheduleBtn');
        const scheduleForm = document.getElementById('scheduleForm');
        const saveScheduleBtn = document.getElementById('saveScheduleBtn');
        const cancelScheduleBtn = document.getElementById('cancelScheduleBtn');
        const closeFormBtn = document.getElementById('closeFormBtn');
        const scheduleTableBody = document.getElementById('scheduleTableBody');
        const formTitle = document.getElementById('formTitle');
        
        // Get current gym ID from session
        const gymId = '<?php echo $_SESSION['gym_data']['profile']['gymId'] ?? $_SESSION['user_id'] ?? ''; ?>';
        
        if (!gymId) {
            console.error('Gym ID not found in session');
            return;
        }
        
        // Reference to gym's schedule in Firebase
        const scheduleRef = database.ref(`gyms/${gymId}/schedule`);
        let isEditing = false;
        let currentScheduleId = null;
        
        // Show/hide form
        function toggleForm(show = true, scheduleData = null) {
            if (show) {
                if (scheduleData) {
                    // Edit mode
                    formTitle.textContent = 'Edit Class';
                    document.getElementById('classDay').value = scheduleData.day || 'Monday';
                    document.getElementById('classType').value = scheduleData.className || 'Yoga';
                    
                    if (scheduleData.time) {
                        // Extracts "HH:MM - HH:MM" and ignores any "AM/PM" part for backward compatibility
                        const timeString = scheduleData.time.split(' ')[0];
                        const timeParts = timeString.split('-');
                        if (timeParts.length === 2) {
                            document.getElementById('classStartTime').value = timeParts[0].trim();
                            document.getElementById('classEndTime').value = timeParts[1].trim();
                        }
                    } else {
                        document.getElementById('classStartTime').value = '';
                        document.getElementById('classEndTime').value = '';
                    }

                    isEditing = true;
                    currentScheduleId = scheduleData.id;
                } else {
                    // Add mode
                    formTitle.textContent = 'Add New Class';
                    document.getElementById('classDay').value = 'Monday';
                    document.getElementById('classType').value = 'Yoga';
                    document.getElementById('classStartTime').value = '';
                    document.getElementById('classEndTime').value = '';
                    isEditing = false;
                    currentScheduleId = null;
                }
                scheduleForm.style.display = 'block';
            } else {
                scheduleForm.style.display = 'none';
            }
        }
        
        // Event Listeners
        addScheduleBtn.addEventListener('click', () => toggleForm(true));
        cancelScheduleBtn.addEventListener('click', () => toggleForm(false));
        closeFormBtn.addEventListener('click', () => toggleForm(false));
        
        
        // Save schedule item
        saveScheduleBtn.addEventListener('click', () => {
            const day = document.getElementById('classDay').value.trim();
            const classType = document.getElementById('classType').value.trim();
            const startTime24 = document.getElementById('classStartTime').value;
            const endTime24 = document.getElementById('classEndTime').value;
            
            if (!day || !classType || !startTime24 || !endTime24) {
                alert('Please fill in all fields, including start and end times.');
        return;
    }

            if (startTime24 >= endTime24) {
                alert('End time must be after start time.');
        return;
    }

            // --- New function to format 24-hour time to 12-hour AM/PM ---
            function formatTo12Hour(timeString) {
                const [hourString, minute] = timeString.split(':');
                const hour = +hourString; // Convert to number
                const period = hour >= 12 ? 'PM' : 'AM';
                const adjustedHour = hour % 12 === 0 ? 12 : hour % 12;
                // Pad hour with a zero if it's a single digit
                const formattedHour = adjustedHour.toString().padStart(2, '0');
                return `${formattedHour}:${minute} ${period}`;
            }

            const startTime12 = formatTo12Hour(startTime24);
            const endTime12 = formatTo12Hour(endTime24);
            const time = `${startTime12} - ${endTime12}`;
            
            const timeInputForOverlapCheck = `${startTime24} - ${endTime24}`;

    // Parse time range into minutes
    function toMinutes(t) {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
    }

    function parseTimeRange(rangeStr) {
        const parts = rangeStr.split('-').map(s => s.trim());
        if (parts.length !== 2) return null;
        return {
            start: toMinutes(parts[0]),
            end: toMinutes(parts[1])
        };
    }

    // --- Function to check for an exact duplicate entry ---
    function isDuplicateEntry(snapshot, day, classType, time) {
        let isDuplicate = false;
        snapshot.forEach(child => {
            const item = child.val();
            // Safeguard against malformed data in the database
            if (!item || !item.day || !item.className || !item.time) {
                return; 
            }

            // Don't compare against the item being edited
            if (isEditing && child.key === currentScheduleId) {
                return; 
            }

            // Trim all strings for a reliable comparison
            if (item.day.trim() === day.trim() && 
                item.className.trim() === classType.trim() && 
                item.time.trim() === time.trim()) {
                isDuplicate = true;
            }
        });
        return isDuplicate;
    }

    function hasOverlap(startA, endA, startB, endB) {
        return startA < endB && endA > startB;
    }

    const newTimeRange = parseTimeRange(timeInputForOverlapCheck);
    if (!newTimeRange) {
        alert('Could not parse the time range.');
        return;
    }

    // ✅ NOW CHECK FOR OVERLAPS FIRST
    scheduleRef.once('value').then(snapshot => {
        // --- First, check for exact duplicates ---
        if (isDuplicateEntry(snapshot, day, classType, time)) {
            saveScheduleBtn.disabled = true;
            alert(`Error: A class with the exact same day, type, and time already exists.`);
            setTimeout(() => { saveScheduleBtn.disabled = false; }, 500); // Re-enable after a moment
            return; // Stop execution
        }

        let warningShown = false;

        snapshot.forEach(child => {
            const item = child.val();
            if (item.day !== day) return;
            if (isEditing && child.key === currentScheduleId) return;

            const existing = parseTimeRange(item.time?.split(' ')[0]); // extract "9:00 - 10:00"
            if (!existing) return;

            if (hasOverlap(newTimeRange.start, newTimeRange.end, existing.start, existing.end)) {
                alert(`⚠️ Overlap detected: ${item.className} is scheduled on ${day} at ${item.time}`);
                warningShown = true;
            }
        });

        // ✅ Continue saving after check
        const scheduleData = {
            day: day,
            className: classType,
            time: time,
            updatedAt: firebase.database.ServerValue.TIMESTAMP
        };

        if (isEditing && currentScheduleId) {
            scheduleRef.child(currentScheduleId).update(scheduleData)
                .then(() => {
                    console.log('Updated with overlap warning.');
                    toggleForm(false);
                })
                .catch(error => {
                    console.error('Update error:', error);
                    alert('Failed to update schedule.');
                });
        } else {
            scheduleData.createdAt = firebase.database.ServerValue.TIMESTAMP;
            scheduleRef.push(scheduleData)
                .then(() => {
                    console.log('Added with overlap warning.');
                    toggleForm(false);
                })
                .catch(error => {
                    console.error('Add error:', error);
                    alert('Failed to add schedule.');
                });
        }
    });
});
        
        // Render schedule items
        function renderSchedule(snapshot) {
            scheduleTableBody.innerHTML = '';
            
            if (!snapshot.exists()) {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td colspan="4" class="text-center py-4">
                        No schedule items found. Click "+ Add Class" to create one.
                    </td>
                `;
                scheduleTableBody.appendChild(row);
                return;
            }
            
            // Convert snapshot to array and sort by day
            const schedules = [];
            const daysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
            
            snapshot.forEach(childSnapshot => {
                schedules.push({
                    id: childSnapshot.key,
                    ...childSnapshot.val()
                });
            });
            
            // Sort by day of the week
            schedules.sort((a, b) => {
                return daysOrder.indexOf(a.day) - daysOrder.indexOf(b.day);
            });
            
            // Render each schedule item
            schedules.forEach(item => {
                const row = document.createElement('tr');
                row.dataset.id = item.id;
                row.innerHTML = `
                    <td>${item.day}</td>
                    <td>${item.className}</td>
                    <td>${item.time}</td>
                    <td class="actions">
                        <button class="btn btn-sm btn-primary edit-btn" style="margin-right: 5px;">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn btn-sm btn-danger delete-btn">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </td>
                `;
                
                // Add event listeners
                row.querySelector('.edit-btn').addEventListener('click', () => {
                    toggleForm(true, item);
                });
                
                row.querySelector('.delete-btn').addEventListener('click', () => {
                    if (confirm('Are you sure you want to delete this class?')) {
                        scheduleRef.child(item.id).remove()
                            .then(() => console.log('Schedule deleted successfully'))
                            .catch(error => {
                                console.error('Error deleting schedule:', error);
                                alert('Failed to delete schedule. Please try again.');
                            });
                    }
                });
                
                scheduleTableBody.appendChild(row);
            });
        }
        
        // Load schedule data
        scheduleRef.on('value', renderSchedule, (error) => {
            console.error('Error loading schedule:', error);
            scheduleTableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center py-4 text-danger">
                        Error loading schedule. Please refresh the page.
                    </td>
                </tr>
            `;
        });
        
        console.log('Schedule manager initialized successfully');
    }
    
    // Initialize when DOM is fully loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initScheduleManager);
    } else {
        initScheduleManager();
    }
</script>
