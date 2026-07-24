# XPASYO

Capstone project with a PHP web admin panel and an Ionic/Angular mobile app, both connected to Firebase.

## Repository Structure

```
Xpasyo/
├── web/    # PHP web application (admin panel, gym management)
└── app/    # Ionic/Angular mobile app (iOS/Android)
```

## Web Application 

PHP-based web interface for gym management, classes, notifications, and admin features.

```bash
cd web
composer install
php -S localhost:8000 -t .
```

Open [http://localhost:8000/pages/INDEX.php](http://localhost:8000/pages/INDEX.php)

See [web/README.md](web/README.md) for more details.

**Firebase setup:** Copy `web/json_files/serviceAccountKey.example.json` to `web/json_files/serviceAccountKey.json` and add your Firebase service account credentials.

## Mobile Application

Cross-platform mobile app built with Angular, Ionic, and Capacitor.

```bash
cd app
npm install
npm start
```

See [app/README.md](app/README.md) for build and deployment instructions.

## Deployment

The web app can be deployed with Docker or Render. Configuration files live in `web/` (`Dockerfile`, `render.yaml`). The root `render.yaml` points Render to the `web/` directory.

## License

This project is part of the XPASYO system. All rights reserved.
