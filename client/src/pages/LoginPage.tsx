import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Loader2, AlertCircle, Phone, KeyRound } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';

// Form schemas
const phoneFormSchema = z.object({
  phoneNumber: z.string()
    .min(10, 'Phone number must be at least 10 digits')
    .regex(/^[0-9+\s()-]+$/, 'Phone number can only contain digits, spaces, and the symbols +()-')
});

const otpFormSchema = z.object({
  otp: z.string()
    .min(4, 'Verification code must be at least 4 digits')
    .max(8, 'Verification code cannot exceed 8 digits')
    .regex(/^[0-9]+$/, 'Verification code can only contain digits')
});

type PhoneFormValues = z.infer<typeof phoneFormSchema>;
type OtpFormValues = z.infer<typeof otpFormSchema>;

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { sendVerificationCode, confirmVerificationCode, isAuthenticated, isLoading, error } = useAuth();
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [pageState, setPageState] = useState<'phone' | 'otp'>('phone');
  const [verificationSent, setVerificationSent] = useState(false);
  const [timer, setTimer] = useState(0);
  const [localError, setLocalError] = useState<string | null>(null);
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);

  // If user is already authenticated, redirect to chat page
  useEffect(() => {
    if (isAuthenticated) {
      setLocation('/');
    }
  }, [isAuthenticated, setLocation]);

  // Form for phone number
  const phoneForm = useForm<PhoneFormValues>({
    resolver: zodResolver(phoneFormSchema),
    defaultValues: {
      phoneNumber: '',
    },
  });

  // Form for OTP
  const otpForm = useForm<OtpFormValues>({
    resolver: zodResolver(otpFormSchema),
    defaultValues: {
      otp: '',
    },
  });

  // Timer for resending code
  useEffect(() => {
    let interval: number | undefined;
    
    if (timer > 0) {
      interval = window.setInterval(() => {
        setTimer((prevTimer) => prevTimer - 1);
      }, 1000);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [timer]);

  // Handle phone number submission
  const onPhoneSubmit = async (data: PhoneFormValues) => {
    setLocalError(null);
    
    try {
      // Format the phone number (remove spaces, ensure country code)
      let formattedNumber = data.phoneNumber.replace(/\s+/g, '');
      
      // If the number doesn't start with +, assume it's a national number and add +1 (US)
      // In a real app, you'd want to use a proper phone input component with country selection
      if (!formattedNumber.startsWith('+')) {
        formattedNumber = `+${formattedNumber}`;
      }
      
      // Send OTP using Firebase
      const result = await sendVerificationCode(
        formattedNumber,
        'recaptcha-container'
      );
      
      setConfirmationResult(result);
      setVerificationSent(true);
      setPageState('otp');
      setTimer(60); // 60 second cooldown for resending
    } catch (error: any) {
      setLocalError(error.message || 'Failed to send verification code');
    }
  };

  // Handle OTP verification
  const onOtpSubmit = async (data: OtpFormValues) => {
    setLocalError(null);
    
    try {
      if (!confirmationResult) {
        throw new Error('Please request a verification code first');
      }
      
      const user = await confirmVerificationCode(confirmationResult, data.otp);
      
      if (user) {
        // User exists, redirect to chat
        setLocation('/');
      } else {
        // User does not exist, redirect to registration with phone number pre-filled
        setLocation(`/register?phone=${phoneForm.getValues().phoneNumber}`);
      }
    } catch (error: any) {
      setLocalError(error.message || 'Failed to verify code');
    }
  };

  const resendCode = async () => {
    const phoneNumber = phoneForm.getValues().phoneNumber;
    
    if (!phoneNumber) {
      setLocalError('Phone number is required');
      return;
    }
    
    try {
      const result = await sendVerificationCode(
        phoneNumber,
        'recaptcha-container'
      );
      
      setConfirmationResult(result);
      setVerificationSent(true);
      setTimer(60); // Reset timer
      setLocalError(null);
    } catch (error: any) {
      setLocalError(error.message || 'Failed to resend verification code');
    }
  };

  const goBackToPhone = () => {
    setPageState('phone');
    setLocalError(null);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-tr from-blue-50 to-blue-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-md">
        <Card className="border-0 shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Welcome Back</CardTitle>
            <CardDescription className="text-center">
              {pageState === 'phone' 
                ? 'Enter your phone number to receive a verification code'
                : 'Enter the verification code sent to your phone'}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {(error || localError) && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error || localError}</AlertDescription>
              </Alert>
            )}
            
            {pageState === 'phone' ? (
              <Form {...phoneForm}>
                <form onSubmit={phoneForm.handleSubmit(onPhoneSubmit)} className="space-y-4">
                  <FormField
                    control={phoneForm.control}
                    name="phoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <div className="flex">
                            <Phone className="mr-2 h-5 w-5 text-gray-400 self-center" />
                            <Input 
                              placeholder="Enter your phone number"
                              {...field} 
                              className="flex-1"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div ref={recaptchaContainerRef} id="recaptcha-container"></div>
                  
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending Code...
                      </>
                    ) : (
                      'Get Verification Code'
                    )}
                  </Button>
                </form>
              </Form>
            ) : (
              <Form {...otpForm}>
                <form onSubmit={otpForm.handleSubmit(onOtpSubmit)} className="space-y-4">
                  <FormField
                    control={otpForm.control}
                    name="otp"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Verification Code</FormLabel>
                        <FormControl>
                          <div className="flex">
                            <KeyRound className="mr-2 h-5 w-5 text-gray-400 self-center" />
                            <Input 
                              placeholder="Enter the code sent to your phone" 
                              {...field} 
                              className="flex-1"
                              maxLength={8}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {timer > 0 && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Resend code in:</span>
                        <span>{timer} seconds</span>
                      </div>
                      <Progress value={(timer / 60) * 100} className="h-1" />
                    </div>
                  )}
                  
                  <div className="flex flex-col space-y-2">
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        'Verify'
                      )}
                    </Button>
                    
                    <div className="flex justify-between">
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        onClick={goBackToPhone}
                        disabled={isLoading}
                      >
                        Change Number
                      </Button>
                      
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        onClick={resendCode}
                        disabled={timer > 0 || isLoading}
                      >
                        Resend Code
                      </Button>
                    </div>
                  </div>
                </form>
              </Form>
            )}
          </CardContent>
          
          <CardFooter className="flex justify-center">
            <p className="text-xs text-gray-500 text-center">
              By continuing, you agree to our Terms of Service and Privacy Policy.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}