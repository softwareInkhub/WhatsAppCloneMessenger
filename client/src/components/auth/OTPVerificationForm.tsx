import React, { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { verifyOTP, requestOTP } from "@/lib/api";
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
    mutationFn: (params: {phoneNumber: string, verificationCode: string}) => 
      verifyOTP(params.phoneNumber, params.verificationCode),
    onSuccess: (data) => {
      setIsLoading(false);
      
      if (data.isNewUser) {
        // New user, go to registration
        setIsNewUser(true);
        console.log("New user, navigating to /register");
        toast({
          title: "OTP Verified",
          description: "Please complete your profile",
        });
        // Short timeout to ensure state is updated before navigation
        setTimeout(() => {
          setLocation("/register");
        }, 50);
      } else {
        // Existing user, log in
        login(data.user);
        console.log("User logged in, navigating to /chat");
        toast({
          title: "Login Successful",
          description: "Welcome back!",
        });
        // Short timeout to ensure state is updated before navigation
        setTimeout(() => {
          setLocation("/chat");
        }, 50);
      }
    },
    onError: (error: any) => {
      setIsLoading(false);
      
      // Default error message
      let errorMessage = "Failed to verify OTP";
      
      // Extract error message if available
      if (error?.status === 401) {
        errorMessage = "Invalid verification code. Please check and try again.";
      } else if (error?.status === 404) {
        errorMessage = "We couldn't find your verification code. Please request a new one.";  
      } else if (error?.data?.error) {
        errorMessage = error.data.error;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Verification Failed",
        description: errorMessage,
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
    console.log("Going back to login page");
    setLocation("/");
  };

  const resendMutation = useMutation({
    mutationFn: (data: { phoneNumber: string }) => requestOTP(data.phoneNumber),
    onSuccess: (data) => {
      toast({
        title: "OTP Resent",
        description: "Please check your phone for the new verification code",
      });
    },
    onError: (error: any) => {
      // Improved error handling for resend OTP
      let errorMessage = "Failed to resend verification code";
      
      if (error?.status === 429) {
        errorMessage = "Too many requests. Please wait a moment before trying again.";
      } else if (error?.status === 400) {
        errorMessage = "Invalid phone number format. Please go back and check your number.";
      } else if (error?.data?.error) {
        errorMessage = error.data.error;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleResendOTP = () => {
    if (!phoneNumber) {
      toast({
        title: "Error",
        description: "Phone number is missing. Please go back to the login page.",
        variant: "destructive",
      });
      return;
    }
    
    resendMutation.mutate({ phoneNumber });
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
