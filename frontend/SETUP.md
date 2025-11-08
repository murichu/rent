# Frontend Setup Guide

## Installation Steps

Since PowerShell script execution is restricted on your system, follow these manual steps:

### 1. Install Dependencies

Open a Command Prompt (cmd.exe) or enable PowerShell scripts, then run:

```bash
cd frontend
npm install
```

### 2. Start Development Server

```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`

### 3. Build for Production

```bash
npm run build
```

## Alternative: Using Command Prompt

If you continue to have issues with PowerShell, use Command Prompt (cmd.exe) instead:

1. Press `Win + R`
2. Type `cmd` and press Enter
3. Navigate to the frontend directory:
   ```
   cd C:\Users\Jakobi\rent\frontend
   ```
4. Run npm commands as normal

## Troubleshooting PowerShell

To enable PowerShell script execution (run PowerShell as Administrator):

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## Project Structure

- **src/components/ui/** - shadcn/ui components (Button, Card, Input, Badge)
- **src/pages/** - Main application pages (Dashboard, Properties, Tenants, Payments, Login)
- **src/lib/** - Utility functions
- **src/App.jsx** - Main application with routing
- **src/main.jsx** - Application entry point

## Features Included

✅ Modern React 18 with Vite
✅ Tailwind CSS for styling
✅ shadcn/ui components
✅ React Router for navigation
✅ Axios for API calls
✅ Lucide React icons
✅ Responsive design
✅ Authentication flow
✅ Dashboard with statistics
✅ Properties management
✅ Tenants management
✅ Payments tracking

## API Integration

The frontend is configured to proxy API requests to `http://localhost:5000`. Make sure your backend API is running before starting the frontend.

## Next Steps

1. Install dependencies: `npm install`
2. Start the backend API (if not already running)
3. Start the frontend: `npm run dev`
4. Open browser to `http://localhost:3000`
5. Login with your credentials
