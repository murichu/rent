import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useState, useEffect } from "react";
import Layout from "./components/Layout";
import {
  AppErrorBoundary,
  PageErrorBoundary,
} from "./components/ErrorBoundary";
import { ThemeProvider } from "./components/ThemeProvider";
import loggingService from "./services/loggingService";
import Dashboard from "./pages/Dashboard";
import Properties from "./pages/Properties";
import Tenants from "./pages/Tenants";
import Payments from "./pages/Payments";
import Leases from "./pages/Leases";
import Invoices from "./pages/Invoices";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import MPesa from "./pages/MPesa";
import Agents from "./pages/Agents";
import Caretakers from "./pages/Caretakers";
import Messages from "./pages/Messages";
import Login from "./pages/Login";
import Units from "./pages/Units";
import Notices from "./pages/Notices";
import Penalties from "./pages/Penalties";
import Users from "./pages/Users";
import Agencies from "./pages/Agencies";
import PesaPal from "./pages/PesaPal";
import KCB from "./pages/KCB";
import Expenses from "./pages/Expenses";
import Maintenance from "./pages/Maintenance";
import AuditLogs from "./pages/AuditLogs";
import PublicProperties from "./pages/PublicProperties";
import LandingPage from "./pages/LandingPage";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(true);

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem("token");
    setIsAuthenticated(!!token);

    // Log app initialization
    loggingService.info("App initialized", {
      component: "App",
      action: "initialize",
      data: {
        isAuthenticated: !!token,
        timestamp: new Date().toISOString(),
      },
    });
  }, []);

  const PrivateRoute = ({ children }) => {
    return isAuthenticated ? children : <Navigate to="/login" />;
  };

  return (
    <ThemeProvider defaultTheme="light" storageKey="haven-ui-theme">
      <AppErrorBoundary>
        <Router>
          <Routes>
            {/* Public Routes */}
            <Route
              path="/landing"
              element={
                <PageErrorBoundary pageName="LandingPage">
                  <LandingPage />
                </PageErrorBoundary>
              }
            />
            <Route
              path="/public-properties"
              element={
                <PageErrorBoundary pageName="PublicProperties">
                  <PublicProperties />
                </PageErrorBoundary>
              }
            />
            <Route
              path="/login"
              element={
                <PageErrorBoundary pageName="Login">
                  <Login setIsAuthenticated={setIsAuthenticated} />
                </PageErrorBoundary>
              }
            />

            {/* Private Routes */}
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <PageErrorBoundary pageName="Layout">
                    <Layout setIsAuthenticated={setIsAuthenticated} />
                  </PageErrorBoundary>
                </PrivateRoute>
              }
            >
              <Route
                index
                element={
                  <PageErrorBoundary pageName="Dashboard">
                    <Dashboard />
                  </PageErrorBoundary>
                }
              />
              <Route
                path="properties"
                element={
                  <PageErrorBoundary pageName="Properties">
                    <Properties />
                  </PageErrorBoundary>
                }
              />
              <Route
                path="units"
                element={
                  <PageErrorBoundary pageName="Units">
                    <Units />
                  </PageErrorBoundary>
                }
              />
              <Route
                path="tenants"
                element={
                  <PageErrorBoundary pageName="Tenants">
                    <Tenants />
                  </PageErrorBoundary>
                }
              />
              <Route
                path="leases"
                element={
                  <PageErrorBoundary pageName="Leases">
                    <Leases />
                  </PageErrorBoundary>
                }
              />
              <Route
                path="invoices"
                element={
                  <PageErrorBoundary pageName="Invoices">
                    <Invoices />
                  </PageErrorBoundary>
                }
              />
              <Route
                path="payments"
                element={
                  <PageErrorBoundary pageName="Payments">
                    <Payments />
                  </PageErrorBoundary>
                }
              />
              <Route
                path="mpesa"
                element={
                  <PageErrorBoundary pageName="MPesa">
                    <MPesa />
                  </PageErrorBoundary>
                }
              />
              <Route
                path="pesapal"
                element={
                  <PageErrorBoundary pageName="PesaPal">
                    <PesaPal />
                  </PageErrorBoundary>
                }
              />
              <Route
                path="kcb"
                element={
                  <PageErrorBoundary pageName="KCB">
                    <KCB />
                  </PageErrorBoundary>
                }
              />
              <Route
                path="agents"
                element={
                  <PageErrorBoundary pageName="Agents">
                    <Agents />
                  </PageErrorBoundary>
                }
              />
              <Route
                path="caretakers"
                element={
                  <PageErrorBoundary pageName="Caretakers">
                    <Caretakers />
                  </PageErrorBoundary>
                }
              />
              <Route
                path="expenses"
                element={
                  <PageErrorBoundary pageName="Expenses">
                    <Expenses />
                  </PageErrorBoundary>
                }
              />
              <Route
                path="maintenance"
                element={
                  <PageErrorBoundary pageName="Maintenance">
                    <Maintenance />
                  </PageErrorBoundary>
                }
              />
              <Route
                path="notices"
                element={
                  <PageErrorBoundary pageName="Notices">
                    <Notices />
                  </PageErrorBoundary>
                }
              />
              <Route
                path="penalties"
                element={
                  <PageErrorBoundary pageName="Penalties">
                    <Penalties />
                  </PageErrorBoundary>
                }
              />
              <Route
                path="users"
                element={
                  <PageErrorBoundary pageName="Users">
                    <Users />
                  </PageErrorBoundary>
                }
              />
              <Route
                path="agencies"
                element={
                  <PageErrorBoundary pageName="Agencies">
                    <Agencies />
                  </PageErrorBoundary>
                }
              />
              <Route
                path="messages"
                element={
                  <PageErrorBoundary pageName="Messages">
                    <Messages />
                  </PageErrorBoundary>
                }
              />
              <Route
                path="reports"
                element={
                  <PageErrorBoundary pageName="Reports">
                    <Reports />
                  </PageErrorBoundary>
                }
              />
              <Route
                path="audit-logs"
                element={
                  <PageErrorBoundary pageName="AuditLogs">
                    <AuditLogs />
                  </PageErrorBoundary>
                }
              />
              <Route
                path="settings"
                element={
                  <PageErrorBoundary pageName="Settings">
                    <Settings />
                  </PageErrorBoundary>
                }
              />
            </Route>
          </Routes>
        </Router>
      </AppErrorBoundary>
    </ThemeProvider>
  );
}

export default App;
