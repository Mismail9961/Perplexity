import { useEffect } from "react";
import { Outlet, Link, useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

export default function AppLayout() {
  const { isAuthenticated, clearSession } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    function handleSessionExpired() {
      clearSession();
      navigate("/sign-in");
    }
    window.addEventListener("askly:session-expired", handleSessionExpired);
    return () =>
      window.removeEventListener("askly:session-expired", handleSessionExpired);
  }, [clearSession, navigate]);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b border-border/60 px-3 md:px-6 bg-background/70 backdrop-blur sticky top-0 z-20">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
              <Link to="/" className="md:hidden font-serif text-lg">
                askly
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <Button
                asChild
                size="sm"
                variant="ghost"
                className="text-muted-foreground hover:text-foreground"
              >
                <Link to="/discover">Discover</Link>
              </Button>
              {!isAuthenticated && (
                <Button
                  asChild
                  size="sm"
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Link to="/sign-in">Sign in</Link>
                </Button>
              )}
            </div>
          </header>
          <main className="flex-1 min-w-0">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
