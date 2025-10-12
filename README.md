# Property Rental Management SaaS

A comprehensive property rental management system built with React, Node.js, Express, Prisma, and MongoDB.

## 🚀 Features

- **Property Management**: Add, edit, and track properties and units
- **Tenant Management**: Manage tenant information and track ratings
- **Lease Management**: Create and manage rental agreements
- **Invoice & Payment Tracking**: Automated invoice generation and payment tracking
- **Automated Tenant Ratings**: System calculates tenant ratings based on payment history and penalties
- **Penalty System**: Automatic late payment and overstay penalty calculation
- **Vacate Notices**: Track tenant move-out notices
- **Dashboard Analytics**: Real-time insights and visualizations
- **Multi-tenancy**: Support for multiple property management agencies
- **Role-based Access Control**: Admin and user roles

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v18 or higher)
- **npm** (v9 or higher)
- **MongoDB** (v6 or higher)

## 🛠️ Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd rent
```

### 2. Install dependencies

```bash
# Install root dependencies
npm install

# Install API dependencies
cd api
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Return to root
cd ..
```

### 3. Set up environment variables

#### API Configuration

Create `api/.env` file:

```bash
DATABASE_URL=mongodb://127.0.0.1:27017/rental_saas
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
PORT=4000
```

**⚠️ Security Note**: Never commit `.env` files. Always use strong, unique secrets in production.

### 4. Set up the database

```bash
cd api

# Generate Prisma Client
npm run prisma:generate

# Push schema to MongoDB
npm run prisma:push

# (Optional) Seed the database with sample data
npm run seed
```

## 🚦 Running the Application

### Development Mode

From the root directory:

```bash
# Run both frontend and API concurrently
npm run dev
```

This will start:
- **Frontend**: http://localhost:5173
- **API**: http://localhost:4000

### Run Individually

**Frontend only:**
```bash
npm run start:frontend
```

**API only:**
```bash
npm run start:api
```

### Production Build

```bash
# Build API
cd api
npm run build
npm start

# Build Frontend
cd ../frontend
npm run build
npm run preview
```

## 📁 Project Structure

```
rent/
├── api/                      # Backend API
│   ├── src/
│   │   ├── routes/          # API route handlers
│   │   ├── middleware/      # Auth & other middleware
│   │   ├── services/        # Business logic
│   │   ├── db.js           # Prisma client
│   │   └── server.js       # Express app entry
│   ├── prisma/
│   │   ├── schema.prisma   # Database schema
│   │   └── seed.ts         # Database seeding
│   ├── .env.example
│   └── package.json
├── frontend/                 # React frontend
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/          # Page components
│   │   ├── App.jsx         # Main app component
│   │   └── main.jsx        # Entry point
│   └── package.json
└── package.json             # Root package.json

```

## 🔑 API Endpoints

### Authentication
- `POST /auth/register` - Register new agency and admin user
- `POST /auth/login` - Login

### Properties
- `GET /properties` - List all properties
- `POST /properties` - Create property
- `GET /properties/:id` - Get property details
- `PUT /properties/:id` - Update property
- `DELETE /properties/:id` - Delete property

### Tenants
- `GET /tenants` - List all tenants
- `POST /tenants` - Create tenant
- `GET /tenants/:id` - Get tenant details
- `PUT /tenants/:id` - Update tenant
- `DELETE /tenants/:id` - Delete tenant

### Leases
- `GET /leases` - List all leases
- `POST /leases` - Create lease
- `PUT /leases/:id` - Update lease
- `DELETE /leases/:id` - Delete lease

### Invoices & Payments
- `GET /invoices` - List invoices
- `POST /invoices` - Create invoice
- `GET /payments` - List payments
- `POST /payments` - Record payment

### Dashboard
- `GET /dashboard/stats` - Get dashboard statistics

## 🔐 Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## 🏗️ Technology Stack

**Frontend:**
- React 18
- React Router
- Axios
- Chart.js
- Formik + Yup
- TailwindCSS 4
- Vite

**Backend:**
- Node.js
- Express
- Prisma ORM
- MongoDB
- JWT Authentication
- Zod Validation

## 📝 Scripts

### Root Level
- `npm run dev` - Run frontend and API concurrently
- `npm run start:frontend` - Start frontend dev server
- `npm run start:api` - Start API dev server

### API (`/api`)
- `npm run dev` - Start API in development mode
- `npm run build` - Build API for production
- `npm start` - Start built API
- `npm run prisma:generate` - Generate Prisma Client
- `npm run prisma:push` - Push schema to database
- `npm run seed` - Seed database

### Frontend (`/frontend`)
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 🧪 Testing

_(Tests will be added soon)_

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## 🚀 Deployment

### Environment Variables

Make sure to set these in production:

```bash
# API
DATABASE_URL=<your-production-mongodb-url>
JWT_SECRET=<strong-secret-key>
PORT=4000

# Frontend (if needed)
VITE_API_URL=<your-api-url>
```

### Database Migration

```bash
cd api
npm run prisma:push
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License.

## 👥 Authors

Your Name/Team

## 🆘 Support

For support, email your-email@example.com or open an issue in the repository.

## 📚 Additional Resources

- [Prisma Documentation](https://www.prisma.io/docs/)
- [React Documentation](https://react.dev/)
- [Express Documentation](https://expressjs.com/)
- [MongoDB Documentation](https://docs.mongodb.com/)

---

Made with ❤️ for property managers
