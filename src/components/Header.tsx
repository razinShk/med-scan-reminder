
import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ChevronLeft, Home, Calendar, PlusCircle } from "lucide-react";

interface HeaderProps {
  title?: string;
  showBackButton?: boolean;
}

export default function Header({ title, showBackButton = false }: HeaderProps) {
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  
  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header 
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300 backdrop-blur-lg px-4 py-3",
        scrolled ? "bg-background/80 shadow-sm" : "bg-background/0"
      )}
    >
      <div className="container max-w-md mx-auto flex items-center justify-between">
        {showBackButton ? (
          <Link 
            to={-1 as any} 
            className="flex items-center text-sm font-medium hover:text-primary transition-colors"
            aria-label="Go back"
          >
            <ChevronLeft className="h-5 w-5 mr-1" />
            Back
          </Link>
        ) : (
          <div className="w-[70px]"></div>
        )}
        
        <h1 className={cn(
          "text-lg font-medium transition-all",
          scrolled ? "opacity-100" : "opacity-0"
        )}>
          {title}
        </h1>
        
        <nav className="flex items-center space-x-1">
          {location.pathname !== "/" && (
            <Link 
              to="/" 
              className={cn(
                "p-2 rounded-full hover:bg-secondary transition-colors",
                location.pathname === "/" && "text-primary"
              )}
              aria-label="Home"
            >
              <Home className="h-5 w-5" />
            </Link>
          )}
          
          {location.pathname !== "/reminders" && (
            <Link 
              to="/reminders" 
              className={cn(
                "p-2 rounded-full hover:bg-secondary transition-colors",
                location.pathname === "/reminders" && "text-primary"
              )}
              aria-label="Reminders"
            >
              <Calendar className="h-5 w-5" />
            </Link>
          )}
          
          {location.pathname !== "/scan" && (
            <Link 
              to="/scan" 
              className={cn(
                "p-2 rounded-full hover:bg-secondary transition-colors",
                location.pathname === "/scan" && "text-primary"
              )}
              aria-label="Scan Prescription"
            >
              <PlusCircle className="h-5 w-5" />
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
