import React, { useState, useEffect } from 'react';
import { useLocation, useSearch } from 'wouter';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Loader2, AlertCircle, Mail, User, Phone } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Registration form schema
const registrationFormSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username cannot exceed 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  email: z.string()
    .email('Please enter a valid email address'),
  phoneNumber: z.string()
    .min(10, 'Phone number must be at least 10 digits')
    .regex(/^[0-9+\s()-]+$/, 'Phone number can only contain digits, spaces, and the symbols +()-')
});

type RegistrationFormValues = z.infer<typeof registrationFormSchema>;

export default function RegistrationPage() {
  const [, setLocation] = useLocation();
  const { registerUser, isAuthenticated, isLoading, error, firebaseUser } = useAuth();
  const [localError, setLocalError] = useState<string | null>(null);
  const search = useSearch();
  
  // Get phone number from search params if it exists
  const searchParams = new URLSearchParams(search);
  const phoneFromParams = searchParams.get('phone') || '';
  
  // If user is already authenticated, redirect to chat page
  useEffect(() => {
    if (isAuthenticated) {
      setLocation('/');
    }
  }, [isAuthenticated, setLocation]);

  // Verify that a phone has been verified with Firebase before registration
  useEffect(() => {
    if (!firebaseUser?.phoneNumber) {
      setLocalError('Phone verification required. Please login first.');
    }
  }, [firebaseUser]);

  // Registration form
  const form = useForm<RegistrationFormValues>({
    resolver: zodResolver(registrationFormSchema),
    defaultValues: {
      username: '',
      email: '',
      phoneNumber: phoneFromParams || firebaseUser?.phoneNumber || '',
    },
  });

  useEffect(() => {
    // Update phone number field when firebaseUser changes
    if (firebaseUser?.phoneNumber) {
      form.setValue('phoneNumber', firebaseUser.phoneNumber);
    }
  }, [firebaseUser, form]);

  // Handle registration form submission
  const onSubmit = async (data: RegistrationFormValues) => {
    setLocalError(null);
    
    try {
      if (!firebaseUser) {
        throw new Error('Phone verification required before registration');
      }
      
      await registerUser(data);
      setLocation('/');
    } catch (error: any) {
      setLocalError(error.message || 'Registration failed');
    }
  };

  const goToLogin = () => {
    setLocation('/login');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-tr from-blue-50 to-blue-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-md">
        <Card className="border-0 shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Create Account</CardTitle>
            <CardDescription className="text-center">
              Enter your details to complete registration
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
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <div className="flex">
                          <User className="mr-2 h-5 w-5 text-gray-400 self-center" />
                          <Input 
                            placeholder="Choose a username" 
                            {...field} 
                            className="flex-1"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <div className="flex">
                          <Mail className="mr-2 h-5 w-5 text-gray-400 self-center" />
                          <Input 
                            placeholder="Enter your email" 
                            type="email"
                            {...field} 
                            className="flex-1"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
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
                            disabled={!!firebaseUser?.phoneNumber}
                            className="flex-1"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex flex-col space-y-2">
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isLoading || !firebaseUser}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Registering...
                      </>
                    ) : (
                      'Create Account'
                    )}
                  </Button>
                  
                  <div className="text-center mt-4">
                    <Button 
                      type="button" 
                      variant="link" 
                      onClick={goToLogin}
                    >
                      Already have an account? Login
                    </Button>
                  </div>
                </div>
              </form>
            </Form>
          </CardContent>
          
          <CardFooter className="flex justify-center">
            <p className="text-xs text-gray-500 text-center">
              By registering, you agree to our Terms of Service and Privacy Policy.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}