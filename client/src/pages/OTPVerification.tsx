import React from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import MainLayout from "@/components/layout/MainLayout";
import OTPVerificationForm from "@/components/auth/OTPVerificationForm";

export default function OTPVerification() {
  const { phoneNumber } = useAuth();
  const [, setLocation] = useLocation();
  
  // Redirect to login if phone number is not set
  React.useEffect(() => {
    if (!phoneNumber) {
      console.log("Phone number not set, redirecting to /");
      window.location.href = "/";
    }
  }, [phoneNumber]);
  
  return (
    <MainLayout>
      <div className="min-h-screen flex flex-col items-center p-4 pt-16">
        <OTPVerificationForm />
      </div>
    </MainLayout>
  );
}
