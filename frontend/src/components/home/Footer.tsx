import { Mail } from "lucide-react";
import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="bg-foreground text-background border-t border-background/10">
      <div className="container px-4 py-8">
        <div className="flex flex-col space-y-6 lg:flex-row lg:justify-between lg:items-start lg:space-y-0">
          {/* Brand */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <img
                src="/assets/images/logo.png"
                alt="Dorm Made Logo"
                className="h-8 w-8 lg:h-10 lg:w-10 object-contain"
              />
              <span className="font-extrabold text-lg lg:text-xl tracking-tight">
                Dorm <span className="text-primary">Made</span>
              </span>
            </div>
            <p className="text-sm text-background/60 max-w-xs">
              Connecting college students through authentic cultural food experiences.
            </p>
          </div>

          {/* Contact */}
          <div className="space-y-2">
            <h3 className="font-bold text-base">Keep in touch</h3>
            <div className="flex items-center space-x-2 text-sm text-background/60">
              <Mail className="h-4 w-4 flex-shrink-0 text-primary" />
              <span>hello@dormmade.com</span>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-background/10 text-center space-y-2">
          <div className="flex items-center justify-center gap-4 text-xs text-background/50">
            <Link to="/terms" className="hover:text-background transition-colors">
              Terms &amp; Conditions
            </Link>
            <span aria-hidden="true">·</span>
            <Link to="/privacy" className="hover:text-background transition-colors">
              Privacy Policy
            </Link>
            <span aria-hidden="true">·</span>
            <Link to="/house-rules" className="hover:text-background transition-colors">
              House Rules
            </Link>
          </div>
          <p className="text-xs text-background/50">© 2026 Dorm Made. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
