# Crime Reporting System

A web-based crime reporting system with real-time reporting, OTP verification, and location tracking.

## Project Structure

- **frontend/**: HTML, CSS (Tailwind), and JavaScript frontend
- **backend/**: Node.js + Express + Prisma backend

## Setup

### Backend
```bash
cd backend
npm install
npx prisma migrate dev
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Features

- User authentication with OTP
- Crime reporting with photos and location
- Real-time status tracking
- Admin dashboard
- Emergency SOS button

