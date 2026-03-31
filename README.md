# SchoolHub Management System

A comprehensive school management application with Redis database for persistent data storage.

## Features

- Student Management
- Fee Management
- Attendance Tracking
- Exam Management
- Reports Generation
- Multi-user access (Developer, Admin, Student)
- Complete data isolation between schools

## Multi-School Architecture

SchoolHub is designed to support multiple schools with complete data isolation:

- Each school has its own unique data (students, fees, exams, etc.)
- School administrators can only access their own school's data
- The developer user has access to manage all schools and admins
- Each school can have unique configurations and settings

## Data Persistence with Redis

This application uses Redis to store data persistently between sessions. The data is stored in a Redis database and retrieved when the application starts, ensuring that:

- Your data is preserved when you reload the page
- Your data is available when opening the app in different tabs or browsers
- Your data is protected against browser cache clearing

## Setup and Installation

### Prerequisites

- Node.js (v14+)
- Redis Server

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Start the Redis and Express server:
   ```
   ./start-server.sh
   ```
4. In a separate terminal, start the frontend:
   ```
   npm run dev
   ```

### Manual Setup (if start-server.sh doesn't work)

1. Install Redis (if not already installed)
   - Ubuntu/Debian: `sudo apt-get install redis-server`
   - macOS: `brew install redis`
   - Windows: Download from [Redis for Windows](https://github.com/microsoftarchive/redis/releases)

2. Start Redis server
   ```
   redis-server
   ```

3. Start the Express backend server
   ```
   node server.js
   ```

4. Start the frontend development server
   ```
   npm run dev
   ```

## Environment Variables

Create a `.env` file in the root directory with:

```
PORT=3001
REDIS_URL=redis://localhost:6379
```

## Getting Started

1. Log in as the developer user:
   - Username: `developer`
   - Password: `dev123`

2. First, create a school from the developer dashboard
   - Provide all required school details
   - Make note of the Student ID Prefix you set

3. Next, create an admin user for the school
   - Assign the admin to the school you created
   - Set a secure password

4. Log out and log back in as the admin
   - Begin adding students, managing fees, etc.

## Data Backup and Export

Even with Redis persistence, it's recommended to:
- Use the in-app data export feature periodically
- Back up your Redis data regularly 