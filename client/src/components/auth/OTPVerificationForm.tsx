import React, { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { verifyOTP } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { OTPInput } from "@/components/ui/otp-input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function OTPVerificationForm() {
  const [otpValue, setOtpValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { phoneNumber, setIsNewUser, login } = useAuth();
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: verifyOTP,
    onSuccess: (data) => {
      setIsLoading(false);
      
      if (data.isNewUser) {
        // New user, go to registration
        setIsNewUser(true);
        setLocation("/register");
        toast({
          title: "OTP Verified",
          description: "Please complete your profile",
        });
      } else {
        // Existing user, log in
        login(data.user);
        setLocation("/chat");
        toast({
          title: "Login Successful",
          description: "Welcome back!",
        });
      }
    },
    onError: (error) => {
      setIsLoading(false);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to verify OTP",
        variant: "destructive",
      });
    },
  });

  const handleOTPComplete = (otp: string) => {
    setOtpValue(otp);
  };

  const handleVerify = () => {
    if (otpValue.length !== 6) {
      toast({
        title: "Error",
        description: "Please enter the complete 6-digit code",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    mutation.mutate({
      phoneNumber,
      verificationCode: otpValue,
    });
  };

  const handleBackToLogin = () => {
    setLocation("/");
  };

  const handleResendOTP = () => {
    // In a real app, would call the request OTP API again
    toast({
      title: "OTP Resent",
      description: "Please check your phone for the new code",
    });
  };

  return (
    <div className="w-full max-w-md mx-auto flex flex-col items-center">
      <div className="mb-8">
        <Button 
          variant="ghost" 
          className="flex items-center text-primary" 
          onClick={handleBackToLogin}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5"></path>
            <path d="M12 19l-7-7 7-7"></path>
          </svg>
          Back
        </Button>
      </div>
      
      <h1 className="text-2xl font-semibold mb-2">Verify your number</h1>
      <p className="text-center text-text-secondary dark:text-gray-400 mb-8">
        We've sent a code to {phoneNumber}
      </p>
      
      <div className="w-full space-y-6">
        <OTPInput 
          length={6}
          onComplete={handleOTPComplete}
          onChange={setOtpValue}
          disabled={isLoading}
        />
        
        <Button 
          className="w-full bg-primary hover:bg-primary-dark text-white py-3"
          onClick={handleVerify}
          disabled={isLoading || otpValue.length !== 6}
        >
          {isLoading ? "Verifying..." : "Verify"}
        </Button>
        
        <div className="text-center">
          <p className="text-text-secondary dark:text-gray-400 text-sm">
            Didn't receive the code? <Button variant="link" className="text-primary font-medium p-0" onClick={handleResendOTP}>Resend</Button>
          </p>
        </div>
      </div>
    </div>
  );
}
