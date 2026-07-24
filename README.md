# XPASYO Draft

A prototype/draft project containing experimental features and proof-of-concept implementations for the XPASYO system.

## Project Structure

```
XPASYO_DRAFT/
├── elements/       # Custom web components
├── json_files/     # JSON data files and utilities
├── pages/          # HTML pages
├── vendor/         # Third-party libraries
├── style.css       # Global styles
└── knn_streetmap_rule_based.html  # Main demo page
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
   cd path/to/XPASYO_DRAFT
   
   # Start PHP development server (PHP 5.4+)
   php -S localhost:8000 -t .
   ```
   Then open `http://localhost:8000/pages/INDEX.php` in your browser

2. **For XAMPP/WAMP/MAMP:**
   - Place the project folder in your web server's root directory (e.g., `htdocs` or `www`)
   - Start your local server (Apache, MySQL if needed)
   - Access the site at `http://localhost/XPASYO_DRAFT/pages/INDEX.php`

## Dependencies

- OpenStreetMap
- Custom JavaScript utilities
- External mapping libraries

## Setting Up GitHub Repository

1. **Initialize Git repository (if not already done):**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. **Create a new repository on GitHub** (if you haven't already)

3. **Link your local repository to GitHub:**
   ```bash
   git remote add origin https://github.com/yourusername/XPASYO_DRAFT.git
   git branch -M main
   git push -u origin main
   ```

4. **For existing repositories, push your changes:**
   ```bash
   git add .
   git commit -m "Your commit message"
   git push
   ```

## Development Notes

- The main entry point is `pages/INDEX.php`
- All PHP includes should use relative paths from the document root
- For database connections, use `localhost` in development and update for production

## License

This project is part of the XPASYO system. All rights reserved.
