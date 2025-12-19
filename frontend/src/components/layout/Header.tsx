import { Button } from "@/components/ui/button";
import { User, CalendarPlus, CalendarSearch, Menu, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { removeAuthToken, getAuthToken } from "@/services";
import { analytics } from "@/lib/analytics";

export function Header() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      const user = localStorage.getItem("currentUser");
      const token = getAuthToken();

      if (user && token && user !== "undefined") {
        try {
          const parsedUser = JSON.parse(user);
          setCurrentUser(parsedUser);
        } catch (error) {
          console.error("Error parsing user data:", error);
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
    };

    checkAuth();
    window.addEventListener("storage", checkAuth);
    window.addEventListener("userLogin", checkAuth);

    return () => {
      window.removeEventListener("storage", checkAuth);
      window.removeEventListener("userLogin", checkAuth);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("currentUser");
    localStorage.removeItem("userEmail");
    removeAuthToken();
    setCurrentUser(null);
    setMobileMenuOpen(false);
    analytics.reset();
    window.location.href = "/";
  };

  return (
    <>
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center justify-between px-4 max-w-[1400px] mx-auto">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <img src="/assets/images/logo.png" alt="Dorm Made" className="h-8 w-8 object-contain" />
            <span className="font-bold text-lg hidden lg:inline">Dorm Made</span>
          </Link>

          {/* Desktop Navigation - Logged In */}
          {currentUser && (
            <nav className="hidden lg:flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/create-event" className="flex items-center gap-2">
                  <CalendarPlus className="h-4 w-4" />
                  <span>Host event</span>
                </Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/explore" className="flex items-center gap-2">
                  <CalendarSearch className="h-4 w-4" />
                  <span>Explore events</span>
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild className="ml-2">
                <Link to={`/profile/${currentUser.id}`} className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>Profile</span>
                </Link>
              </Button>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                Logout
              </Button>
            </nav>
          )}

          {/* Desktop Navigation - Not Logged In */}
          {!currentUser && (
            <div className="hidden lg:flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link to="/login" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>Login</span>
                </Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/signup">Sign Up</Link>
              </Button>
            </div>
          )}

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-2 hover:bg-accent rounded-md transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 top-16 z-40 bg-background">
          <nav className="px-4 py-6 space-y-2 max-w-[1400px] mx-auto">
            {currentUser ? (
              <>
                <Link
                  to="/create-event"
                  className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <CalendarPlus className="h-5 w-5" />
                  <span className="font-medium">Host event</span>
                </Link>

                <Link
                  to="/explore"
                  className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <CalendarSearch className="h-5 w-5" />
                  <span className="font-medium">Explore events</span>
                </Link>

                <Link
                  to={`/profile/${currentUser.id}`}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <User className="h-5 w-5" />
                  <span className="font-medium">Profile</span>
                </Link>

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent transition-colors text-left"
                >
                  <span className="font-medium">Logout</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="block px-4 py-3 rounded-lg hover:bg-accent transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="font-medium">Login</span>
                </Link>

                <Link
                  to="/signup"
                  className="block px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-center font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign Up
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </>
  );
}
