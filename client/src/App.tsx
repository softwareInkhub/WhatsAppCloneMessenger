import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ChatProvider } from "@/contexts/ChatContext";
import Login from "@/pages/Login";
import OTPVerification from "@/pages/OTPVerification";
import Registration from "@/pages/Registration";
import Chat from "@/pages/Chat";
import NotFound from "@/pages/not-found";

// Protected route wrapper that redirects to login if not authenticated
function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      console.log("Not authenticated, redirecting to login");
      setLocation("/");
    }
  }, [isAuthenticated, isLoading, setLocation]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (!isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  return <Component />;
}

// Auth flow manager
function AuthFlowManager() {
  const { isAuthenticated, phoneNumber, isNewUser } = useAuth();
  const [location, setLocation] = useLocation();
  
  useEffect(() => {
    // Already authenticated, go to chat unless explicitly on login pages
    if (isAuthenticated && 
        location !== "/verify" && 
        location !== "/register" && 
        location !== "/") {
      console.log("Already authenticated, redirecting to chat");
      setLocation("/chat");
      return;
    }
    
    // Verification page without phone number
    if (location === "/verify" && !phoneNumber) {
      console.log("No phone number for verification, redirecting to login");
      setLocation("/");
      return;
    }
    
    // Registration page without being a new user or having phone number
    if (location === "/register" && (!isNewUser || !phoneNumber)) {
      console.log("Not a new user or missing phone number, redirecting to login");
      setLocation("/");
      return;
    }
  }, [isAuthenticated, location, phoneNumber, isNewUser, setLocation]);
  
  return null;
}

function Router() {
  return (
    <>
      <AuthFlowManager />
      <Switch>
        <Route path="/" component={Login} />
        <Route path="/verify" component={OTPVerification} />
        <Route path="/register" component={Registration} />
        <Route path="/chat">
          <ProtectedRoute component={Chat} />
        </Route>
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ChatProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </ChatProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
