<?php
require_once __DIR__ . '/firebase_config.php';

/**
 * Helper function to get user-friendly upload error messages
 */
function getUploadError($errorCode) {
    switch ($errorCode) {
        case UPLOAD_ERR_INI_SIZE:
            return 'The uploaded file exceeds the upload_max_filesize directive in php.ini';
        case UPLOAD_ERR_FORM_SIZE:
            return 'The uploaded file exceeds the MAX_FILE_SIZE directive that was specified in the HTML form';
        case UPLOAD_ERR_PARTIAL:
            return 'The uploaded file was only partially uploaded';
        case UPLOAD_ERR_NO_FILE:
            return 'No file was uploaded';
        case UPLOAD_ERR_NO_TMP_DIR:
            return 'Missing a temporary folder';
        case UPLOAD_ERR_CANT_WRITE:
            return 'Failed to write file to disk';
        case UPLOAD_ERR_EXTENSION:
            return 'A PHP extension stopped the file upload';
        default:
            return 'Unknown upload error (Code: ' . $errorCode . ')';
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Handle form submission
    $gymName = $_POST['gym-name'] ?? '';
    $ownerName = $_POST['owner-name'] ?? '';
    $gcashAccountName = $_POST['gcash-account-name'] ?? '';
    $gcashAccountNumber = $_POST['gcash-account-number'] ?? '';
    $address = $_POST['address'] ?? '';
    $description = $_POST['description'] ?? '';
    $district = $_POST['district'] ?? '';
    $fitnessType = $_POST['type-fitness'] ?? '';
    $classTypes = [];
    
    // Process class types and their price ranges
    if (!empty($_POST['class_types']) && is_array($_POST['class_types'])) {
        foreach ($_POST['class_types'] as $classType) {
            if (!empty($classType['name'])) {
                $className = $classType['name'];
                $price = !empty($classType['price']) ? (float)$classType['price'] : 0;
                
                $classTypes[] = [
                    'name' => $className,
                    'price' => $price,
                    'price_display' => '₱' . number_format($price, 2)
                ];
            }
        }
    }
    
    $email = $_POST['email'] ?? '';
    $password = $_POST['password'] ?? '';
    
    try {
        // 1. Create user in Firebase Authentication
        $userProperties = [
            'email' => $email,
            'emailVerified' => false,
            'password' => $password,
            'displayName' => $ownerName,
            'disabled' => false,
        ];

        $createdUser = $auth->createUser($userProperties);
        $userId = $createdUser->uid;

        // 2. Handle file uploads with Base64 encoding
        $uploads = [];
        $fileFields = ['gym-logo', 'business-permit', 'gym-picture', 'additional-gym-picture'];

        // Debug: Log the $_FILES array
        error_log('$_FILES array: ' . print_r($_FILES, true));

        foreach ($fileFields as $field) {
            if (isset($_FILES[$field]) && $_FILES[$field]['error'] === UPLOAD_ERR_OK) {
                $file = $_FILES[$field];

                // Debug: Log file info
                error_log("Processing file upload for {$field}: " . print_r($file, true));

                try {
                    // Verify file exists and is readable
                    if (!is_uploaded_file($file['tmp_name'])) {
                        throw new Exception("Temporary file is not a valid upload");
                    }

                    // Get file info and validate type
                    $fileInfo = getimagesize($file['tmp_name']);
                    if ($fileInfo === false) {
                        throw new Exception("File '{$file['name']}' is not a valid image. Please upload only PNG or JPEG files.");
                    }

                    // Explicitly check MIME type for security
                    $mimeType = $fileInfo['mime'];
                    $allowedMimeTypes = ['image/jpeg', 'image/png'];
                    if (!in_array($mimeType, $allowedMimeTypes)) {
                        throw new Exception("Invalid file type for '{$file['name']}'. Only PNG and JPEG images are allowed.");
                    }

                    // Check file size (max 2MB)
                    $maxFileSize = 2 * 1024 * 1024; // 2MB
                    if ($file['size'] > $maxFileSize) {
                        throw new Exception("File size exceeds maximum limit of 2MB");
                    }

                    // Convert file to base64
                    $fileContent = file_get_contents($file['tmp_name']);
                    if ($fileContent === false) {
                        throw new Exception("Failed to read file: " . $file['tmp_name']);
                    }

                    // Encode to base64 and create data URL
                    $base64 = base64_encode($fileContent);
                    $mimeType = $fileInfo['mime'];
                    $dataUrl = "data:{$mimeType};base64,{$base64}";

                    // Store the data URL with metadata
                    $uploads[$field] = [
                        'data' => $dataUrl,
                        'filename' => $file['name'],
                        'type' => $mimeType,
                        'size' => $file['size'],
                        'width' => $fileInfo[0],
                        'height' => $fileInfo[1]
                    ];

                    // Debug: Log success
                    error_log("Successfully encoded {$file['name']} (size: {$file['size']} bytes)");

                } catch (Exception $e) {
                    $errorMsg = "Error uploading {$field}: " . $e->getMessage();
                    error_log($errorMsg);
                    error_log("Stack trace: " . $e->getTraceAsString());

                    // If this is a required field, rethrow the exception
                    if ($field !== 'additional-gym-picture') {
                        throw new Exception($errorMsg, 0, $e);
                    }
                }
            } else {
                $errorCode = $_FILES[$field]['error'] ?? 'file_not_set';
                $errorMessage = "File upload error for {$field}: " . getUploadError($errorCode);
                error_log($errorMessage);

                // If this is a required field and not the optional one, throw an exception
                if ($field !== 'additional-gym-picture' && $errorCode !== UPLOAD_ERR_NO_FILE) {
                    throw new Exception($errorMessage);
                }
            }
        }
        
        // Debug: Log the uploads array
        error_log('Uploads array: ' . print_r($uploads, true));



        // 3. Store gym data in Firebase Realtime Database
        $gymData = [
            'gymInfo' => [
                'name' => $gymName,
                'address' => $address,
                'description' => $description,
                'district' => $district,
                'fitnessType' => $fitnessType,
                'classTypes' => $classTypes,
                'classTypesList' => array_column($classTypes, 'name'), // For easier searching
                'classType' => $classType,
                'status' => 'pending',
                'description' => $description, // Using address as description for now
                'contactEmail' => $email,
                'paymentInfo' => [
                    'gcashAccountName' => $gcashAccountName,
                    'gcashAccountNumber' => $gcashAccountNumber,
                ],
                'approved' => false, 
                'contactPhone' => '', // Add this field to your form
                'businessHours' => '9:00 AM - 10:00 PM', // Default, update from form
                'amenities' => [], // Add amenities as array
                'createdAt' => ['.sv' => 'timestamp'],
                'updatedAt' => ['.sv' => 'timestamp']
            ],
            'owner' => [
                'name' => $ownerName,
                'email' => $email,
                'role' => 'owner',
                'phone' => '', // Add phone to registration form
                'createdAt' => ['.sv' => 'timestamp'],
                'lastLogin' => ['.sv' => 'timestamp']
            ],
            'uploads' => $uploads,
            'members' => [
                $userId => [
                    'joinedAt' => ['.sv' => 'timestamp'],
                    'role' => 'owner',
                    'status' => 'active'
                ]
            ],
            // Add these fields at the root level for easier access
            'gym_name' => $gymName,
            'gym_logo' => $uploads['gym-logo'] ?? '',
            'gym_address' => $address,
            'description' => $description,
            'owner_name' => $ownerName,
            'created_at' => ['.sv' => 'timestamp'],
            'updated_at' => ['.sv' => 'timestamp']
        ];
        
        // Debug: Log the data we're about to save
        error_log('Gym data to be saved: ' . print_r($gymData, true));


        // Debug: Log the data we're about to save
        error_log('Attempting to save gym data: ' . print_r($gymData, true));

        try {
            // Get a reference to the gym
            $gymRef = $database->getReference("gyms/{$userId}");
            
            // Debug: Log the reference path
            error_log('Saving to database path: gyms/' . $userId);
            
            // Save the data
            $gymRef->set($gymData);
            
            // Verify the data was saved
            $savedData = $gymRef->getValue();
            
            if (!empty($savedData)) {
                error_log('Gym data saved successfully. Retrieved data: ' . print_r($savedData, true));
            } else {
                error_log('Warning: Gym data save might have failed - retrieved empty data after save');
            }
                
        } catch (Exception $e) {
            $error = 'Error saving gym data: ' . $e->getMessage() . ' in ' . $e->getFile() . ' on line ' . $e->getLine();
            error_log($error);
            throw new Exception($error, $e->getCode(), $e);
        }

        // 4. Create user profile
        $userData = [
            'profile' => [
                'displayName' => $ownerName,
                'email' => $email,
                'role' => 'gym_owner',
                'gymId' => $userId,
                'approved' => false,
                'createdAt' => ['.sv' => 'timestamp'],
                'lastLogin' => ['.sv' => 'timestamp'],
               
            ],
            'preferences' => [
                'notifications' => true,
                'emailNotifications' => true
            ]
        ];

        $database->getReference("users/{$userId}")
            ->set($userData, ['database' => $database]);

        // 5. Start session and redirect
   session_start();
   $_SESSION['success_message'] = "Your registration has been submitted and is pending admin approval.";
   header('Location: login.php');
   exit;
   exit;
   

exit;



    } catch (\Exception $e) {
        // Log the error for debugging
        error_log('Registration error: ' . $e->getMessage());
        
        // Show detailed error message for debugging
        die('Registration failed: ' . $e->getMessage() . ' on line ' . $e->getLine());
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="icon" type="image/png" href="../elements/logo web.png">
    
    <title>XPASYO - Gym Registration</title>

    <style>
        body {
            font-family: Arial, sans-serif;
            background-image: url('../elements/REGWEB-BG.gif');
            background-repeat: no-repeat;
            background-size: cover;
            background-position: center center;
            margin: 0;
            /* Changed min-height to height for consistent behavior, and removed overflow: auto from body */
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            animation: fadeIn 1s ease-in-out forwards;
            /* Allow scrolling on the body itself if content exceeds viewport */
            overflow-y: auto; /* Only vertical scrolling for body */
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        .logo {
            position: fixed;
            top: 20px;
            left: 20px;
            z-index: 20;
        }

        .logo img {
            width: 150px;
            height: auto;
        }

        .container {
            background-color: rgba(0, 0, 0, 0.85);
            padding: 35px 50px;
            border-radius: 12px;
            max-width: 580px;
            width: 90%;
            box-shadow: 0 8px 25px rgba(0,0,0,0.6);
            color: white;
            box-sizing: border-box;
            transform: translateY(-20px);
            opacity: 0;
            animation: slideIn 0.8s ease-out 0.5s forwards;
            /* Crucial for scrolling: Add vertical margin and remove fixed height */
            margin: 40px auto; /* Centered horizontally, 40px top/bottom margin */
            /* Removed overflow: auto from container to let body handle scrolling */
            /* min-height: fit-content; */ /* Ensure container expands with content */
            padding-top: 60px; /* Add extra padding at the top to ensure content isn't hidden by logo on scroll */
            padding-bottom: 40px; /* Add extra padding at the bottom */
        }

        @keyframes slideIn {
            from { transform: translateY(-20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }

        h1 {
            text-align: center;
            color: #FFCC00;
            margin-bottom: 30px;
            font-weight: 700;
            text-transform: uppercase;
            font-size: 28px;
        }

        h2 {
            text-align: center;
            color: #FFCC00;
            margin-top: 35px;
            margin-bottom: 20px;
            font-weight: 700;
            text-transform: uppercase;
            font-size: 22px;
        }

        input[type="text"],
        input[type="password"],
        input[type="tel"],
        select {
            width: 100%;
            padding: 14px 18px;
            margin-bottom: 22px;
            border-radius: 6px;
            border: 1px solid #ccc;
            background-color: #fff;
            color: #333;
            font-size: 16px;
            box-sizing: border-box;
            transition: border-color 0.3s ease, background-color 0.3s ease;
        }

        input[type="text"]::placeholder,
        input[type="password"]::placeholder {
            color: #777;
        }

        input[type="text"]:focus,
        input[type="password"]:focus,
        select:focus {
            border-color: #FFCC00;
            outline: none;
            background-color: #f9f9f9;
        }

        .form-row {
            display: flex;
            gap: 25px;
            margin-bottom: 25px;
        }

        .form-row > div {
            flex: 1;
            position: relative;
            /* Added margin-top to allow space for the label above the select */
            margin-top: 22px; /* This pushes the selects down to make space for the label */
        }

        .form-row label {
            position: absolute;
            top: -20px; /* Adjusted to be just above the select box */
            left: 0;
            font-size: 14px;
            color: #FFCC00;
            font-weight: bold;
            pointer-events: none;
            z-index: 1; /* Ensure label is above other elements if overlapping */
            white-space: nowrap; /* Prevent label from wrapping */
        }

        ul {
            list-style-type: none;
            padding-left: 0;
            margin-top: 0;
            margin-bottom: 30px;
        }

        ul li {
            margin-bottom: 20px;
        }

        ul li label {
            display: block;
            margin-bottom: 10px;
            font-weight: 600;
            color: #FFCC00;
            font-size: 15px;
        }

        input[type="file"] {
            width: 100%;
            padding: 14px 18px;
            border-radius: 6px;
            border: 1px solid #ccc;
            background-color: #fff;
            color: #333;
            font-size: 16px;
            box-sizing: border-box;
            cursor: pointer;
            transition: border-color 0.3s ease, background-color 0.3s ease;
            text-align: right;
            background: #fff url("data:image/svg+xml;charset=US-ASCII,%3Csvg fill='gray' height='24' viewBox='0 0 24 24' width='24' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z'/%3E%3C/svg%3E") no-repeat right 18px center;
            background-size: 20px;
            padding-right: 50px;
        }

        input[type="file"]::file-selector-button {
            display: none;
        }

        input[type="file"]:hover {
            border-color: #FFCC00;
            background-color: #f9f9f9;
        }

        button {
            display: block;
            margin: 40px auto 0 auto;
            padding: 16px 0;
            width: 70%;
            background-color: #FFCC00;
            border: none;
            border-radius: 6px;
            font-weight: 700;
            font-size: 20px;
            color: #1a1a1a;
            cursor: pointer;
            box-shadow: 0 6px 18px rgba(255, 204, 0, 0.5);
            transition: background-color 0.3s ease, transform 0.2s ease, box-shadow 0.3s ease;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        button:hover {
            background-color: #e6b800;
            transform: translateY(-3px);
            box-shadow: 0 8px 20px rgba(255, 204, 0, 0.6);
        }

        button:active {
            transform: translateY(0);
            box-shadow: 0 5px 12px rgba(255, 204, 0, 0.5);
        }

        select {
            -webkit-appearance: none;
            -moz-appearance: none;
            appearance: none;
            background: #fff url("data:image/svg+xml;charset=US-ASCII,%3Csvg fill='gray' height='24' viewBox='0 0 24 24' width='24' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M7 10l5 5 5-5z'/%3E%3C/svg%3E") no-repeat right 18px center;
            background-size: 18px;
            color: #333;
            padding-right: 50px;
        }

        select option[disabled]:first-child {
            color: #777;
        }
        select:not([value=""]):valid {
            color: #333;
        }

        /* Adjustments for smaller screens */
        @media (max-width: 768px) {
            .container {
                margin: 20px auto; /* Keep auto for horizontal centering */
                padding: 25px 30px;
                width: 95%;
                padding-top: 60px; /* Add extra top padding so logo does not overlap form */
                padding-bottom: 30px;
            }

            .form-row {
                flex-direction: column;
                gap: 0;
            }

            .form-row > div {
                margin-bottom: 20px;
                margin-top: 20px; /* Adjusted margin-top for labels on mobile */
            }

            .form-row label {
                position: static; /* Let labels flow naturally on mobile */
                margin-bottom: 8px;
            }

            button {
                width: 80%;
                font-size: 18px;
                padding: 14px 0;
            }

            .logo {
                position: fixed;
                top: 0;
                left: 0;
                z-index: 20;
            }
            .logo img {
                width: 60px;
                height: auto;
            }

            .btn-back {
                top: 10px;
                right: 24px;
                left: auto;
                position: fixed;
                padding: 7px 12px;
                font-size: 12px;
                z-index: 30;
            }

            h1 {
                font-size: 24px;
            }

            h2 {
                font-size: 20px;
            }

            input[type="text"],
            input[type="password"],
            select,
            input[type="file"] {
                padding: 12px 15px;
                font-size: 15px;
            }

            input[type="file"] {
                background-size: 16px;
                padding-right: 40px;
            }

            select {
                background-size: 16px;
                padding-right: 40px;
            }
        }
        .btn-back {
            position: fixed;
            top: 20px;
            right: 40px;
            left: auto;
            background-color: #FFCC00;
            color: #000;
            padding: 10px 20px;
            border-radius: 5px;
            font-weight: 600;
            text-decoration: none;
            transition: all 0.3s ease;
            font-size: 14px;
            z-index: 30;
        }
        .btn-back:hover {
            transform: translateY(-3px);
            box-shadow: 0 5px 15px rgba(255, 204, 0, 0.3);
        }
        .char-counter {
  font-size: 11px;
  color: #999;
  margin-top: -18px;
  margin-left: 4px;
  margin-bottom: 10px;
}
    </style>
</head>
<body>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <div class="logo">
        <img src="../elements/XPASYO.png" alt="XPASYO Logo">
    </div>
    <div class="container">
        <form id="registration-form" method="POST" enctype="multipart/form-data" onsubmit="return validateForm()">
              <a href="SIGNIN.php" class="btn-back">← BACK</a>
            <?php if (isset($error)): ?>
                <div class="error-message"><?php echo htmlspecialchars($error); ?></div>
            <?php endif; ?>
            <h1>GYM REGISTRATION FORM</h1>

            <input type="text" id="gym-name" name="gym-name" placeholder="Name of Gym" maxlength="70"  required>
            <div class="char-counter" id="gym-name-counter">0/70 characters</div>
            
            <input type="text" id="owner-name" name="owner-name" placeholder="Name of Facility Owner" maxlength="70"  pattern="[A-Za-z\s]+" 
       title="Only letters and spaces are allowed" required>
        <div class="char-counter" id="owner-name-counter">0/70 characters</div>
        
            <input type="text" id="gcash-account-name" name="gcash-account-name" placeholder="GCash Account Name" required>
            <input type="tel" id="gcash-account-number" name="gcash-account-number" placeholder="GCash Account Number (e.g., 09123456789)" required pattern="09[0-9]{9}" title="Please enter a valid 11-digit GCash number starting with 09." maxlength="11" oninput="this.value = this.value.replace(/[^0-9]/g, '');">

            <input type="text" id="address" name="address" placeholder="Address"maxlength="100"  required>
            <div class="char-counter" id="address-counter">0/100 characters</div>
       
            <script>
            document.addEventListener('DOMContentLoaded', function () {
            const fields = [
                { id: 'gym-name', max: 70, name: 'Gym Name' },
                { id: 'owner-name', max: 70, name: 'Owner Name' },
                { id: 'address', max: 500, name: 'Address' },
                { id: 'description', max: 500, name: 'Description' }
            ];

            fields.forEach(field => {
                const input = document.getElementById(field.id);
                const counter = document.getElementById(field.id + '-counter');
                let alertShown = false;

                if (!input) {
                    console.warn(`Element with id "${field.id}" not found`);
                    return;
                }

                function updateCounter() {
                    const currentLength = input.value.length;
                    counter.textContent = `${currentLength}/${field.max} characters`;
                    
                    // Visual warning when approaching limit
                    if (currentLength >= field.max - 10) {
                        counter.classList.add('warning');
                        input.classList.add('warning');
                    } else {
                        counter.classList.remove('warning');
                        input.classList.remove('warning');
                    }
                }

                // Handle input event - only for reaching exactly max length
                input.addEventListener('input', function () {
                    updateCounter();
                    
                    // Alert when exactly at max length (from typing)
                    if (this.value.length === field.max && !alertShown) {
                        alert(`You have reached the maximum ${field.max} characters for "${field.name}".`);
                        alertShown = true;
                        setTimeout(() => {
                            alertShown = false;
                        }, 2000);
                    }
                });

                // Handle paste event - check if pasted content exceeds limit
                input.addEventListener('paste', function (e) {
                    const clipboardData = e.clipboardData || window.clipboardData;
                    const pastedData = clipboardData.getData('text');
                    const currentValue = this.value;
                    const newValue = currentValue + pastedData;
                    
                    // Check if the pasted content would exceed the limit
                    if (newValue.length > field.max) {
                        e.preventDefault(); // Prevent the paste
                        alert(`Cannot paste: Text exceeds maximum ${field.max} characters for "${field.name}". Current: ${currentValue.length}, Trying to paste: ${pastedData.length} characters.`);
                    }
                });

                // Initialize counter
                updateCounter();
            });
        });
</script>
            <input type="text" id="description" name="description" placeholder="Description" required>

            <div class="form-row">
                <div>
                    <label for="district">District:</label>
                    <select id="district" name="district" required>
                        <option value="" disabled selected>Select a District</option>
                        <option value="District 1">District 1</option>
                        <option value="District 2">District 2</option>
                        <option value="District 3">District 3</option>
                        <option value="District 4">District 4</option>
                        <option value="District 5">District 5</option>
                        <option value="District 6">District 6</option>
                    </select>
                </div>
                <div>
                    <label for="type-fitness">Type of Fitness Studio:</label>
                    <select id="type-fitness" name="type-fitness" required>
                        <option value="" disabled selected>Select a Type</option>
                        <option value="Small Studio (50 - 100 sqm)">Small Studio (50 - 100 square meters)</option>
                        <option value="Medium Studio (100 - 250 sqm)">Medium Studio (100 - 250 square meters)</option>
                        <option value="Large Studio (250+ sqm)">Large Studio (250+ square meters)</option>
                    </select>
                </div>
            </div>

            <div class="form-section">
                <h3>Class Types & Pricing</h3>
                <div class="class-types-container">
                    <?php
                    $classTypes = [
                        'Zumba' => 'Zumba',
                        'Yoga' => 'Yoga',
                        'HIIT' => 'HIIT',
                        'Circuit Training' => 'Circuit Training',
                        'Aerobics' => 'Aerobics',
                        'Pilates' => 'Pilates'
                    ];
                    
                    foreach ($classTypes as $key => $label): ?>
                        <div class="class-type-item">
                            <label class="checkbox-label">
                                <input type="checkbox" name="class_types[<?php echo $key; ?>][name]" value="<?php echo $key; ?>" 
                                    onchange="togglePriceInput('<?php echo $key; ?>')">
                                <?php echo $label; ?>
                            </label>
                            <div id="price-container-<?php echo $key; ?>" style="display: none; margin-top: 5px;">
                                <div style="display: flex; gap: 10px; margin-top: 5px;">
                                    <input type="number" name="class_types[<?php echo $key; ?>][price]" 
                                        placeholder="Price (₱)" min="0" step="0.01" 
                                        style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                            </div>
                        </div>
                    <?php endforeach; ?>
                </div>
            </div>
            
            <input type="email" id="email" name="email" placeholder="Email Address" required 
                style="width: 100%; padding: 15px; margin: 20px 0 10px 0; border: 1px solid #ddd; border-radius: 6px; font-size: 16px; box-sizing: border-box;" 
                onfocus="this.style.borderColor='#FFCC00'" onblur="this.style.borderColor='#ddd'">
                

            <div style="position: relative; width: 100%;">
            <input type="password" id="password" name="password" placeholder="Account Password" required minlength="6">
            <i class="fa-solid fa-eye" id="toggleIcon1" onclick="togglePassword('password', 'toggleIcon1')" style="
            position: absolute;
            top: 37%;
            right: 30px;
            transform: translateY(-50%);
            cursor: pointer;
            color: #666;
            font-size: 18px;
            "></i>
            </div>
            
            <script>
            function togglePriceInput(className) {
                const checkbox = document.querySelector(`input[name="class_types[${className}][name]"]`);
                const priceContainer = document.getElementById(`price-container-${className}`);
                const priceInputs = priceContainer.querySelectorAll('input[type="number"]');
                
                if (checkbox.checked) {
                    priceContainer.style.display = 'block';
                    priceInputs.forEach(input => input.required = true);
                } else {
                    priceContainer.style.display = 'none';
                    priceInputs.forEach(input => {
                        input.required = false;
                        input.value = '';
                    });
                }
            }
            
            // Add form validation to ensure at least one class type is selected
            document.getElementById('registration-form').addEventListener('submit', function(e) {
                const checkboxes = document.querySelectorAll('input[type="checkbox"][name^="class_types"]:checked');
                if (checkboxes.length === 0) {
                    e.preventDefault();
                    alert('Please select at least one class type');
                    return false;
                }
                
                // Validate price ranges
                let isValid = true;
                checkboxes.forEach(checkbox => {
                    const className = checkbox.name.match(/\[(.*?)\]/)[1];
                    const priceField = document.querySelector(`input[name="class_types[${className}][price]"]`);
                    if (priceField) {
                        const price = parseFloat(priceField.value);
                        if (isNaN(price) || price < 0) {
                            isValid = false;
                            alert('Please enter a valid non-negative price');
                        }
                    }
                });
                
                if (!isValid) {
                    e.preventDefault();
                    return false;
                }
            });
            </script>
            <div style="position: relative; width: 100%;">
            <input type="password" id="confirm-password" name="confirm-password" placeholder="Confirm Password" required>
            <i class="fa-solid fa-eye" id="toggleIcon2" onclick="togglePassword('confirm-password', 'toggleIcon2')" style="
            position: absolute;
            top: 37%;
            right: 30px;
            transform: translateY(-50%);
            cursor: pointer;
            color: #666;
            font-size: 18px;
            "></i>
            </div>
            <small id="password-hint" style="color: #ccc; display: block; margin-top: -10px; margin-bottom: 10px; font-size: 13px;">Password must be at least 8 characters long, with uppercase, lowercase, number, and special character.</small>

            <h2>UPLOAD SECTION</h2>
            <ul>
                <li>
                    <label for="gym-logo">Picture of GYM</label>
                    <input type="file" id="gym-logo" name="gym-logo" accept=".png,.jpeg,.jpg" required onchange="validateFileType(this)">
                </li>
                <li>
                    <label for="business-permit">Business Permit/ License to Operate</label>
                    <input type="file" id="business-permit" name="business-permit" accept=".png,.jpeg,.jpg" required onchange="validateFileType(this)">
                </li>
                <li>
                    <label for="gym-picture">GYM Logo</label>
                    <input type="file" id="gym-picture" name="gym-picture" accept=".png,.jpeg,.jpg" required onchange="validateFileType(this)">
                </li>
                <li>
                    <label for="additional-gym-picture">Additional Picture of GYM (Optional)</label>
                    <input type="file" id="additional-gym-picture" name="additional-gym-picture" accept=".png,.jpeg,.jpg" onchange="validateFileType(this)">
                </li>
            </ul>

            <button type="submit">SUBMIT</button>
        </form>
    </div>
    <script>
        
       function validateFileType(fileInput) {
            if (fileInput.files.length === 0) return;

            const file = fileInput.files[0];
            const fileName = file.name;
            const allowedExtensions = /\.(jpg|jpeg|png)$/i;

            if (!allowedExtensions.test(fileName)) {
                const label = document.querySelector(`label[for="${fileInput.id}"]`);
                const fieldName = label ? label.textContent : 'This field';
                
                alert(`Invalid file type for "${fieldName}".\nPlease upload only PNG, JPG, or JPEG images.`);
                
                fileInput.value = '';
            }
        }

       function validateForm() {
    const gcashNumber = document.getElementById('gcash-account-number').value;
    const gcashPattern = /^09\d{9}$/;
    
    if (!gcashPattern.test(gcashNumber)) {
        alert('Please enter a valid 11-digit GCash number starting with 09.');
        return false;
    }

    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;


    if (password !== confirmPassword) {
        alert('Passwords do not match!');
        return false;
    }

    if (password.length < 6) {
        alert('Password must be at least 6 characters long!');
        return false;
    }

    // Optional: Add strength check or more rules here
    
    if (!strongPasswordRegex.test(password)) {
        alert('Password must be at least 8 characters long and include:\n- Uppercase letter\n- Lowercase letter\n- Number\n- Special character');
        return false;
    }

    return true;
}

function togglePassword(inputId, iconId) {
    const field = document.getElementById(inputId);
    const icon = document.getElementById(iconId);

    if (field.type === "password") {
        field.type = "text";
        icon.classList.remove("fa-eye");
        icon.classList.add("fa-eye-slash");
    } else {
        field.type = "password";
        icon.classList.remove("fa-eye-slash");
        icon.classList.add("fa-eye");
    }
}

// Show real-time feedback
document.getElementById('password').addEventListener('input', function () {
    const hint = document.getElementById('password-hint');
    const password = this.value;
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

    if (strongPasswordRegex.test(password)) {
        hint.textContent = 'Strong password ✅';
        hint.style.color = 'lightgreen';
    } else {
        hint.textContent = 'Password must be at least 8 characters with uppercase, lowercase, number, and special character.';
        hint.style.color = '#ff6666';
    }
});
    </script>
</body>
</html>
