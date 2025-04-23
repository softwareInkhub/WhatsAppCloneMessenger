import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  phoneNumber: string;
  isNewUser: boolean;
  login: (user: User) => void;
  logout: () => void;
  setPhoneNumber: (phone: string) => void;
  setIsNewUser: (isNew: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [phoneNumber, setPhoneNumberState] = useState(() => {
    return localStorage.getItem("whatspe_phone") || "";
  });
  const [isNewUser, setIsNewUserState] = useState(() => {
    return localStorage.getItem("whatspe_is_new_user") === "true";
  });
  const { toast } = useToast();

  useEffect(() => {
    console.log("AuthProvider - Checking localStorage for user data");
    
    // Try to load user from localStorage on initial load
    const storedUser = localStorage.getItem("whatspe_user");
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        console.log("Found user in localStorage, restoring session:", parsedUser);
        setCurrentUser(parsedUser);
        setIsAuthenticated(true);
      } catch (error) {
        console.error("Failed to parse stored user:", error);
        localStorage.removeItem("whatspe_user");
      }
    } else {
      console.log("No user found in localStorage");
    }
    
    setIsLoading(false);
  }, []);

  const login = (user: User) => {
    console.log("Logging in user:", user);
    setCurrentUser(user);
    setIsAuthenticated(true);
    
    // Save user and their phone number to localStorage
    localStorage.setItem("whatspe_user", JSON.stringify(user));
    localStorage.setItem("whatspe_phone", user.phoneNumber);
    
    // Clear the "new user" flag since they're now logged in
    setIsNewUserState(false);
    localStorage.removeItem("whatspe_is_new_user");
    
    toast({
      title: "Logged in successfully",
      description: `Welcome ${user.username}!`,
    });
  };

  const logout = () => {
    setCurrentUser(null);
    setIsAuthenticated(false);
    setPhoneNumberState("");
    setIsNewUserState(false);
    
    // Clear all localStorage items
    localStorage.removeItem("whatspe_user");
    localStorage.removeItem("whatspe_phone");
    localStorage.removeItem("whatspe_is_new_user");
    
    toast({
      title: "Logged out",
      description: "You have been logged out successfully",
    });
  };

  // Update setter functions to also update localStorage
  const setPhoneNumber = (phone: string) => {
    console.log("Setting phone number:", phone);
    localStorage.setItem("whatspe_phone", phone);
    setPhoneNumberState(phone);
  };

  const setIsNewUser = (isNew: boolean) => {
    console.log("Setting isNewUser:", isNew);
    localStorage.setItem("whatspe_is_new_user", isNew.toString());
    setIsNewUserState(isNew);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated,
        isLoading,
        phoneNumber,
        isNewUser,
        login,
        logout,
        setPhoneNumber,
        setIsNewUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
