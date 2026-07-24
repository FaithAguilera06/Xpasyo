# XPASYO Draft

A prototype/draft project containing experimental features and proof-of-concept implementations for the XPASYO system.

## Project Structure

```
web/
├── elements/       # Images and assets
├── json_files/     # JSON data files and utilities
├── pages/          # PHP pages
├── vendor/         # Third-party libraries (Composer)
├── style.css       # Global styles
└── knn_streetmap_rule_based.html  # Mapping demo page
```

## Features

- 🗺️ Interactive mapping with OpenStreetMap
- 📅 Calendar and date picker components
- 🎨 Custom styling and theming
- 📊 Data visualization

## Getting Started

### Local Development with PHP Server

1. **Using PHP's built-in development server:**
   ```bash
   # Navigate to the project root directory
   cd web
   
   # Start PHP development server (PHP 5.4+)
   php -S localhost:8000 -t .
   ```
   Then open `http://localhost:8000/pages/INDEX.php` in your browser

2. **For XAMPP/WAMP/MAMP:**
   - Place the project folder in your web server's root directory (e.g., `htdocs` or `www`)
   - Start your local server (Apache, MySQL if needed)
   - Access the site at `http://localhost/Xpasyo/web/pages/INDEX.php`

## Firebase Setup

Copy `json_files/serviceAccountKey.example.json` to `json_files/serviceAccountKey.json` and add your Firebase service account credentials. This file is not committed to git.

## Dependencies

- OpenStreetMap
- Custom JavaScript utilities
- External mapping libraries

## Development Notes

- The main entry point is `pages/INDEX.php`
- All PHP includes should use relative paths from the document root
- For database connections, use `localhost` in development and update for production

## License

This project is part of the XPASYO system. All rights reserved.
