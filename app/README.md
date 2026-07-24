# F5XPASYO

A modern mobile application built with Angular, Ionic, and Capacitor that provides location-based services and mapping capabilities.

## Features

- 🗺️ Interactive maps with Leaflet and MapLibre GL
- 📍 Location services with geolocation
- 📱 Cross-platform mobile support (iOS/Android)
- 📱 PWA support
- 🔥 Firebase integration
- 📸 Camera and file system access
- 📱 Native device features

## Prerequisites

- Node.js (v18 or later)
- npm (v9 or later)
- Angular CLI (v19 or later)
- Ionic CLI (latest)
- Capacitor (v7 or later)

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Serve the application:
   ```bash
   npm start
   ```

## Building for Production

```bash
# Build the web application
npm run build

# Sync with native platforms
npx cap sync

# Open in Android Studio
npx cap open android
```

## Development

- Run `ng serve` for a dev server
- Navigate to `http://localhost:4200/`
- The app will automatically reload if you change any source files

## Testing

Run `ng test` to execute the unit tests via Karma.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
