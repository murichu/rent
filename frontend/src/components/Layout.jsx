import { useState, useEffect, useRef } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import {
  Home,
  Building2,
  Users,
  CreditCard,
  FileText,
  Receipt,
  BarChart3,
  Settings as SettingsIcon,
  Smartphone,
  UserCog,
  Shield,
  MessageCircle,
  DoorOpen,
  Bell,
  AlertTriangle,
  Building,
  Landmark,
  DollarSign,
  Wrench,
  Activity,
} from "lucide-react";
import NavigationHeader from "./NavigationHeader";
import MobileSidebar from "./MobileSidebar";
import FloatingActionButton from "./FloatingActionButton";
import { useResponsive, useViewportHeight } from "../hooks/useResponsive";

const Layout = ({ setIsAuthenticated }) => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const mainContentRef = useRef(null);
  const previousLocationRef = useRef(location.pathname);

  // Responsive hooks
  const { isMobile, isTablet, isDesktop, breakpoint } = useResponsive();
  const vh = useViewportHeight();

  const navItems = [
    { path: "/", label: "Dashboard", icon: Home },
    { path: "/properties", label: "Properties", icon: Building2 },
    { path: "/units", label: "Units", icon: DoorOpen },
    { path: "/tenants", label: "Tenants", icon: Users },
    { path: "/leases", label: "Leases", icon: FileText },
    { path: "/invoices", label: "Invoices", icon: Receipt },
    { path: "/payments", label: "Payments", icon: CreditCard },
    { path: "/expenses", label: "Expenses", icon: DollarSign },
    { path: "/mpesa", label: "M-Pesa", icon: Smartphone },
    { path: "/pesapal", label: "PesaPal", icon: CreditCard },
    { path: "/kcb", label: "KCB Buni", icon: Landmark },
    { path: "/agents", label: "Agents", icon: UserCog },
    { path: "/caretakers", label: "Caretakers", icon: Shield },
    { path: "/maintenance", label: "Maintenance", icon: Wrench },
    { path: "/notices", label: "Notices", icon: Bell },
    { path: "/penalties", label: "Penalties", icon: AlertTriangle },
    { path: "/users", label: "Users", icon: Users },
    { path: "/agencies", label: "Agencies", icon: Building },
    { path: "/messages", label: "Messages", icon: MessageCircle },
    { path: "/reports", label: "Reports", icon: BarChart3 },
    { path: "/audit-logs", label: "Audit Logs", icon: Activity },
    { path: "/settings", label: "Settings", icon: SettingsIcon },
  ];

  // Handle route changes with loading states
  useEffect(() => {
    if (previousLocationRef.current !== location.pathname) {
      setIsLoading(true);

      // Simulate page transition
      const timer = setTimeout(() => {
        setIsLoading(false);
        // Focus management for accessibility
        if (mainContentRef.current) {
          mainContentRef.current.focus();
        }
      }, 150);

      previousLocationRef.current = location.pathname;
      return () => clearTimeout(timer);
    }
  }, [location.pathname]);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Auto-collapse sidebar on tablet/mobile
  useEffect(() => {
    if (isMobile || isTablet) {
      setSidebarCollapsed(true);
    } else if (isDesktop) {
      setSidebarCollapsed(false);
    }
  }, [isMobile, isTablet, isDesktop]);

  // Handle responsive sidebar toggle
  const handleSidebarToggle = () => {
    if (isMobile) {
      setIsMobileMenuOpen(!isMobileMenuOpen);
    } else {
      setSidebarCollapsed(!sidebarCollapsed);
    }
  };

  // Enhanced swipe gesture handling for mobile navigation
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  const handleTouchStart = (e) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    // Right swipe to open mobile menu (from left edge)
    if (isRightSwipe && touchStart < 50 && !isMobileMenuOpen) {
      setIsMobileMenuOpen(true);
    }

    // Left swipe to close mobile menu
    if (isLeftSwipe && isMobileMenuOpen) {
      setIsMobileMenuOpen(false);
    }
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      // ESC key closes mobile menu
      if (e.key === "Escape" && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }

      // Alt + M toggles mobile menu (accessibility shortcut)
      if (e.altKey && e.key === "m") {
        e.preventDefault();
        setIsMobileMenuOpen(!isMobileMenuOpen);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isMobileMenuOpen]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isMobileMenuOpen]);

  const handleMobileMenuToggle = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Calculate dynamic sidebar width for responsive layout
  const sidebarWidth = sidebarCollapsed ? 0 : 256; // 64 * 4 = 256px (w-64)

  return (
    <div
      className="min-h-screen bg-background"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Navigation Header */}
      <NavigationHeader
        setIsAuthenticated={setIsAuthenticated}
        onMobileMenuToggle={handleMobileMenuToggle}
        isMobileMenuOpen={isMobileMenuOpen}
        onSidebarToggle={handleSidebarToggle}
        sidebarCollapsed={sidebarCollapsed}
      />

      {/* Desktop Sidebar - Responsive */}
      <aside
        className={`hidden lg:fixed lg:left-0 lg:top-16 lg:z-40 lg:h-[calc(100vh-4rem)] lg:border-r lg:bg-card lg:block transition-all duration-300 ease-in-out ${
          sidebarCollapsed ? "lg:w-0 lg:overflow-hidden" : "lg:w-64"
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 min-h-[44px] ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span
                    className={`transition-opacity duration-200 ${
                      sidebarCollapsed ? "opacity-0" : "opacity-100"
                    }`}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      <MobileSidebar
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content - Responsive */}
      <div
        className="pt-16 transition-all duration-300 ease-in-out"
        style={{
          paddingLeft:
            isDesktop && !sidebarCollapsed ? `${sidebarWidth}px` : "0",
          minHeight: vh ? `${vh * 100}px` : "100vh",
        }}
      >
        <main
          ref={mainContentRef}
          className="min-h-[calc(100vh-4rem)] p-4 lg:p-8 focus:outline-none"
          tabIndex={-1}
          role="main"
          aria-label="Main content"
        >
          {/* Loading overlay */}
          {isLoading && (
            <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          )}

          {/* Page content with transition */}
          <div
            className={`transition-opacity duration-150 ${
              isLoading ? "opacity-0" : "opacity-100"
            }`}
          >
            <Outlet />
          </div>
        </main>
      </div>

      {/* Floating Action Button for mobile */}
      <FloatingActionButton />

      {/* Skip to main content link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-50 bg-primary text-primary-foreground px-4 py-2 rounded-md"
      >
        Skip to main content
      </a>
    </div>
  );
};

export default Layout;
