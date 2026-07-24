# AutoSOS
A mobile emergency assistance platform for motorcycle riders, featuring AI-powered mechanic matching, visual/chat diagnostics, and facial recognition payments.

## Project Structure
```
AutoSOS/
├── app/                # Ionic/Angular mobile application (Android)
├── server/             # Node.js/Express backend API
├── ai_models/          # YOLOv8 model files and Python diagnostic scripts
├── json_files/         # Config and service account files
└── README.md
```

## Features
- 📍 GPS-based mechanic matching using Multi-Criteria Filtering (Haversine distance + skill matching)
- 🤖 AI visual diagnostics with YOLOv8 (flat tires, broken lights, broken mirrors, oil leaks)
- 💬 GPT-4 powered chatbot for conversational troubleshooting
- 🔐 Facial recognition payment authorization with FaceNet
- 💳 Simulated wallet system with manual GCash top-up/cash-out

## Getting Started

### Mobile App
```bash
# Navigate to the app directory
cd app

# Install dependencies
npm install

# Run the app locally
npm start
```

### Backend Server
```bash
# Navigate to the server directory
cd server

# Install dependencies
npm install

# Start the server
npm run dev
```

## Firebase / Supabase Setup
Copy `json_files/serviceAccountKey.example.json` to `json_files/serviceAccountKey.json` and add your own service account credentials. This file is gitignored and should never be committed.

## Dependencies
- Ionic Framework, Angular, TypeScript
- Node.js, Express.js
- Supabase (PostgreSQL)
- YOLOv8, OpenCV, Python
- GPT-4 API
- FaceNet API
- Mapbox, Geolocation API

## Development Notes
- The mobile app entry point is under `app/src/`
- Backend API routes are defined in `server/routes/`
- Target platform is Android 9.0+
- For database connections, use local Supabase credentials in development and update for production

## Authors
Aguilera, Faith Anne , Alindada, Isaiah Vincent 


## License
This project is an academic capstone requirement. 

All rights reserved.
