import React from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import MainLayout from "@/components/layout/MainLayout";
import RegistrationForm from "@/components/auth/RegistrationForm";

export default function Registration() {
  const { phoneNumber, isNewUser } = useAuth();
  const [, setLocation] = useLocation();
  
  // Redirect to login if phone number is not set or user is not new
  React.useEffect(() => {
    if (!phoneNumber || !isNewUser) {
      console.log("Registration requirements not met, redirecting to /");
      setLocation("/");
    }
  }, [phoneNumber, isNewUser, setLocation]);
  
  return (
    <MainLayout>
      <div className="min-h-screen flex flex-col items-center p-4 pt-16">
        <RegistrationForm />
      </div>
    </MainLayout>
  );
}
