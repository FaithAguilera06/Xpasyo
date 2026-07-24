<?php
require __DIR__ . '/../vendor/autoload.php';

use Kreait\Firebase\Factory;

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

try {
    // Path to service account file
    $serviceAccountPath = __DIR__.'/../json_files/serviceAccountKey.json';
    if (!file_exists($serviceAccountPath)) {
        throw new Exception('Service account file not found at: ' . $serviceAccountPath);
    }

    // Firebase project configuration
    $databaseUrl = 'https://xpasyo-f5f5f5-default-rtdb.firebaseio.com';
    $storageBucket = 'xpasyo-f5f5f5.appspot.com'; // Default bucket
    
    // Initialize Firebase with all required configurations
    $factory = (new Factory)
        ->withServiceAccount($serviceAccountPath)
        ->withDatabaseUri($databaseUrl);

    // Initialize services
    $database = $factory->createDatabase();
    $auth = $factory->createAuth();
    
    // Initialize Storage with explicit project ID and bucket name
    $storage = $factory->createStorage();
    
    // Store config in globals for backward compatibility
    $GLOBALS['firebaseConfig'] = [
        'databaseURL' => $databaseUrl,
        'storageBucket' => $storageBucket
    ];
    
    // Verify storage bucket exists and is accessible
    try {
        $bucket = $storage->getBucket($storageBucket);
        
        // Test bucket access by listing files (limit to 1 for performance)
        $objects = $bucket->objects(['maxResults' => 1]);
        $objects->rewind(); // This will trigger the API call
        
        error_log('Successfully connected to storage bucket: ' . $storageBucket);
    } catch (\Exception $e) {
        $error = 'Failed to access storage bucket: ' . $e->getMessage() . '\n';
        $error .= 'Bucket: ' . $storageBucket . '\n';
        $error .= 'Make sure the bucket exists and the service account has the necessary permissions.';
        
        error_log($error);
        throw new \Exception($error);
    }
    
} catch (\Exception $e) {
    $error = 'Firebase Error: ' . $e->getMessage() . "\n";
    $error .= 'File: ' . $e->getFile() . ' on line ' . $e->getLine() . "\n";
    $error .= 'Trace: ' . $e->getTraceAsString() . "\n";
    
    // Log the full error
    error_log($error);
    
    // Show a clean error message
    die('Failed to initialize Firebase. Please check the error logs for more details.');
}
?>
