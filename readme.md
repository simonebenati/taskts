# TaskTS

## Prerequisites
- Node.js
- npm
- Docker & Docker Compose
- Browser (Chrome suggested)

## Quick Start

### 1. Database Setup (Docker)
Ensure Docker is running and execute:
```bash
docker-compose down -v  # Reset volumes if you get "PostgreSQL data" errors
docker-compose up -d
```
The database will be available at `postgresql://postgres:mysecretpassword@localhost:5432/Taskts`.

### 2. Setup Backend
From the root directory:
```bash
cd backend
npm install
npm run build
npm start
```

### 2. Setup Frontend
# *note* Open a new terminal
From the root directory:
```bash
cd frontend
npm install
npm run build
npm run preview
```

> [!NOTE]
> The backend requires `key.pem` and `cert.pem` in the `backend` folder for HTTPS.
