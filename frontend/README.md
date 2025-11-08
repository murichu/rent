# Haven Property Management System - Frontend

Modern property management system frontend built with React, Vite, Tailwind CSS, and shadcn/ui.

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm
- Backend API running on port 4000

### Installation & Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

The frontend will be available at `http://localhost:5173`

---

## 📱 Available Pages

### Core Management (20 Pages)
1. **Dashboard** (`/`) - Overview with statistics and analytics
2. **Properties** (`/properties`) - Property portfolio management
3. **Units** (`/units`) - Unit management with availability tracking
4. **Tenants** (`/tenants`) - Tenant information and management
5. **Leases** (`/leases`) - Lease agreements and tracking with expiry alerts
6. **Invoices** (`/invoices`) - Invoice management and tracking
7. **Payments** (`/payments`) - Payment processing and history

### Financial & Integrations
8. **M-Pesa** (`/mpesa`) - M-Pesa payment integration and transactions
9. **PesaPal** (`/pesapal`) - PesaPal payment gateway integration
10. **KCB Buni** (`/kcb`) - KCB Buni payment gateway integration

### Team Management
11. **Agents** (`/agents`) - Agent management and commission tracking
12. **Caretakers** (`/caretakers`) - Caretaker assignments and management
13. **Users** (`/users`) - System user management with role-based access
14. **Agencies** (`/agencies`) - Multi-agency management and tracking

### Communication & Notices
15. **Messages** (`/messages`) - Real-time messaging interface
16. **Notices** (`/notices`) - Tenant notices and announcements
17. **Penalties** (`/penalties`) - Late fees and penalty management

### Reports & Settings
18. **Reports** (`/reports`) - Analytics, reports, and data visualization
19. **Settings** (`/settings`) - User preferences, 2FA, notifications, appearance

---

## 🎨 Tech Stack

### Core Technologies
- **React 18** - Modern React with hooks and concurrent features
- **Vite** - Lightning-fast build tool and dev server with HMR
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Beautiful, accessible, customizable UI components

### Libraries & Tools
- **React Router v6** - Client-side routing and navigation
- **Axios** - HTTP client for API requests
- **Lucide React** - Beautiful, consistent icon library
- **Recharts** - Charting library for analytics (in Reports page)
- **date-fns** - Modern date utility library

### UI Components (shadcn/ui)
- Card, Button, Input, Badge
- Select, Dropdown, Dialog
- Table, Tabs, Alert
- And many more...

---

## 📂 Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── ui/              # shadcn/ui components
│   │   │   ├── card.jsx
│   │   │   ├── button.jsx
│   │   │   ├── input.jsx
│   │   │   ├── badge.jsx
│   │   │   └── ...
│   │   └── Layout.jsx       # Main layout with navigation
│   ├── pages/
│   │   ├── Dashboard.jsx    # Main dashboard
│   │   ├── Properties.jsx   # Property management
│   │   ├── Units.jsx        # Unit management
│   │   ├── Tenants.jsx      # Tenant management
│   │   ├── Leases.jsx       # Lease tracking
│   │   ├── Invoices.jsx     # Invoice management
│   │   ├── Payments.jsx     # Payment processing
│   │   ├── MPesa.jsx        # M-Pesa integration
│   │   ├── PesaPal.jsx      # PesaPal integration
│   │   ├── KCB.jsx          # KCB Buni integration
│   │   ├── Agents.jsx       # Agent management
│   │   ├── Caretakers.jsx   # Caretaker management
│   │   ├── Notices.jsx      # Notices & announcements
│   │   ├── Penalties.jsx    # Penalties & late fees
│   │   ├── Users.jsx        # User management
│   │   ├── Agencies.jsx     # Agency management
│   │   ├── Messages.jsx     # Messaging system
│   │   ├── Reports.jsx      # Analytics & reports
│   │   ├── Settings.jsx     # User settings
│   │   └── Login.jsx        # Authentication
│   ├── lib/
│   │   └── utils.js         # Utility functions (cn, etc.)
│   ├── App.jsx              # Main app with routes
│   ├── main.jsx             # Entry point with axios config
│   └── index.css            # Global styles & Tailwind
├── public/                  # Static assets
├── index.html              # HTML template
├── vite.config.js          # Vite configuration
├── tailwind.config.js      # Tailwind configuration
└── package.json            # Dependencies
```

---

## 🔧 Configuration

### API Integration

The frontend connects to the backend API on port 4000.

**Environment Variables (`.env`):**
```env
# Base URL includes /api/v1
VITE_API_URL=http://localhost:4000/api/v1
```

**Axios Configuration (`src/main.jsx`):**
```javascript
// Base URL already includes /api/v1
axios.defaults.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1'
axios.defaults.headers.common['Content-Type'] = 'application/json'

// Set authorization header if token exists
const token = localStorage.getItem('token')
if (token) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
}
```

**Usage in Components:**
```javascript
import axios from 'axios'

// Since baseURL includes /api/v1, just use the resource path
const response = await axios.get('/properties')
const units = await axios.get('/units')
const data = await axios.post('/units', unitData)
```

**Available API Routes:**
Since `baseURL` is `http://localhost:4000/api/v1`, you only need:
- `/auth/*` - Authentication (e.g., `/auth/login`)
- `/properties` - Properties
- `/units` - Units
- `/tenants` - Tenants
- `/leases` - Leases
- `/invoices` - Invoices
- `/payments` - Payments
- `/mpesa/*` - M-Pesa
- `/pesapal/*` - PesaPal
- `/kcb/*` - KCB
- `/agents` - Agents
- `/caretakers` - Caretakers
- `/notices` - Notices
- `/penalties` - Penalties
- `/users` - Users
- `/agencies` - Agencies
- `/messages` - Messages
- `/reports/*` - Reports
- `/dashboard/*` - Dashboard

---

## 📦 Available Commands

```bash
# Development
npm run dev              # Start dev server with HMR
npm run dev -- --host    # Expose to network

# Build
npm run build            # Build for production
npm run preview          # Preview production build

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint errors

# Dependencies
npm install              # Install dependencies
npm update               # Update dependencies
```

---

## 🎯 Features

### ✅ Implemented Features

#### Core Functionality
- ✅ User authentication (login/logout)
- ✅ Dashboard with real-time statistics
- ✅ Property management (CRUD operations)
- ✅ Unit management with availability tracking
- ✅ Tenant management
- ✅ Lease tracking with expiry alerts
- ✅ Invoice generation and tracking
- ✅ Payment processing and history

#### Payment Integrations
- ✅ M-Pesa payment integration
- ✅ PesaPal payment gateway
- ✅ KCB Buni payment gateway

#### Team & Agency Management
- ✅ Agent management with commission tracking
- ✅ Caretaker assignment and management
- ✅ User management with role-based access
- ✅ Multi-agency management

#### Communication & Notices
- ✅ Real-time messaging system
- ✅ Tenant notices and announcements
- ✅ Penalty and late fee management

#### Reports & Settings
- ✅ Analytics and reporting dashboard
- ✅ User settings (profile, 2FA, notifications)
- ✅ Responsive design (mobile, tablet, desktop)
- ✅ Modern UI with shadcn/ui components

#### UX Features
- ✅ Loading states
- ✅ Error handling
- ✅ Success notifications
- ✅ Form validation
- ✅ Search and filtering
- ✅ Sorting and pagination
- ✅ Responsive navigation
- ✅ Beautiful icons (Lucide)

### 🚧 Missing Features (Backend Ready)

The following features have backend APIs but still need frontend pages:

1. **Ratings** - Property and tenant rating system
2. **Property Sales** - Property sales tracking
3. **Exports** - Data export interface (CSV, PDF)
4. **Jobs** - Background job monitoring
5. **Monitoring** - System health dashboard
6. **Bulk Operations** - Mass update interface
7. **Customization** - UI theme customization
8. **Calendar View** - Event and lease calendar

---

## 🎨 Design System

### Colors (Tailwind)
- **Primary:** Blue shades for main actions
- **Success:** Green for positive actions
- **Warning:** Yellow/Orange for alerts
- **Danger:** Red for destructive actions
- **Neutral:** Gray scale for text and backgrounds

### Typography
- **Headings:** Bold, clear hierarchy
- **Body:** Readable, comfortable spacing
- **Code:** Monospace for technical content

### Components
- Consistent spacing and padding
- Rounded corners for modern look
- Subtle shadows for depth
- Smooth transitions and animations

---

## 🔌 API Integration

### Authentication
```javascript
// Login
axios.post('/api/v1/auth/login', { email, password })

// Logout
axios.post('/api/v1/auth/logout')
```

### Data Fetching
```javascript
// Get properties
axios.get('/api/v1/properties')

// Get tenants
axios.get('/api/v1/tenants')

// Get dashboard stats
axios.get('/api/v1/dashboard/stats')
```

### Authentication Headers
```javascript
// Axios automatically includes token from localStorage
axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
```

---

## 🐛 Troubleshooting

### Frontend Won't Start

**Check Port 5173:**
```bash
# Windows
netstat -ano | findstr :5173

# Mac/Linux
lsof -i :5173
```

**Clear Cache & Reinstall:**
```bash
rm -rf node_modules package-lock.json
npm install
```

### API Calls Failing

1. **Check backend is running:**
   - Backend should be on `http://localhost:4000`
   - Test: `curl http://localhost:4000/health`

2. **Check browser console:**
   - Look for CORS errors
   - Check network tab for failed requests

3. **Verify proxy configuration:**
   - Check `vite.config.js` proxy settings
   - Ensure target is `http://localhost:4000`

4. **Check axios configuration:**
   - Verify `src/main.jsx` has correct base URL
   - Check authentication token is set

### Build Errors

**Clear Vite cache:**
```bash
rm -rf node_modules/.vite
npm run dev
```

**Check for missing dependencies:**
```bash
npm install
```

---

## 🚀 Deployment

### Build for Production

```bash
# Build
npm run build

# Output will be in 'dist' folder
```

### Deploy to Netlify/Vercel

1. Connect your repository
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Set environment variable: `VITE_API_URL=your-production-api-url`

### Deploy to Static Hosting

```bash
# Build
npm run build

# Upload 'dist' folder to your hosting
# Configure server to serve index.html for all routes (SPA)
```

---

## 🔒 Security

- Authentication token stored in localStorage
- Axios interceptors for automatic token inclusion
- Protected routes (redirect to login if not authenticated)
- Input validation on forms
- XSS protection via React
- CORS configured on backend

---

## 📱 Responsive Design

- **Mobile:** < 640px - Optimized for phones
- **Tablet:** 640px - 1024px - Optimized for tablets
- **Desktop:** > 1024px - Full layout with sidebar

All pages are fully responsive and work on all devices.

---

## 🎉 Status

**Frontend Status:** ✅ Production Ready
- **20 pages fully implemented** (up from 13)
- Modern, responsive UI
- Complete API integration
- Authentication working
- All core features functional
- Beautiful design with shadcn/ui
- All payment gateways integrated

**Completion:** ~71% (20/28 potential pages)
- All core business pages: ✅ Complete
- Payment integrations: ✅ Complete (M-Pesa, PesaPal, KCB)
- Team & agency management: ✅ Complete
- Communication & notices: ✅ Complete
- Advanced features: 🚧 8 features remaining

---

## 📞 Support

For issues or questions:
1. Check troubleshooting section above
2. Review browser console for errors
3. Verify backend is running
4. Check network tab for API calls
5. Ensure dependencies are installed

---

## 🔄 Development Workflow

1. Start backend: `cd api && npm run dev`
2. Start frontend: `cd frontend && npm run dev`
3. Make changes to code
4. Vite HMR automatically reloads
5. Test in browser
6. Check console for errors

---

## 📚 Resources

- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [shadcn/ui](https://ui.shadcn.com)
- [Lucide Icons](https://lucide.dev)

---

## 📝 Changelog

### Version 1.1.0 - November 5, 2025

**New Pages Added (7):**
- ✅ Units Management - Complete unit tracking with availability
- ✅ Notices - Tenant communication and announcements
- ✅ Penalties - Late fee and penalty management
- ✅ Users - System user management with roles
- ✅ Agencies - Multi-agency management
- ✅ PesaPal - PesaPal payment gateway integration
- ✅ KCB Buni - KCB payment gateway integration

**Updates:**
- Updated navigation with 7 new menu items
- Added 7 new routes to App.jsx
- Improved sidebar organization with better categorization
- Enhanced payment gateway coverage (3 gateways now supported)

**Statistics:**
- Pages: 13 → 20 (54% increase)
- Completion: 50% → 71% (21% improvement)
- Missing features: 15 → 8 (47% reduction)

---

**Last Updated:** November 5, 2025
**Version:** 1.1.0
**Status:** ✅ Ready for Development & Production
