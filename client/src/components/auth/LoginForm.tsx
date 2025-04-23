import React, { useState } from "react";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { requestOTP } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const phoneSchema = z.object({
  phoneNumber: z.string().min(10, {
    message: "Phone number must be at least 10 digits",
  }),
});

type LoginFormValues = z.infer<typeof phoneSchema>;

export default function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { setPhoneNumber } = useAuth();
  const { toast } = useToast();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(phoneSchema),
    defaultValues: {
      phoneNumber: "",
    },
  });

  const mutation = useMutation({
    mutationFn: (values: LoginFormValues) => requestOTP(values.phoneNumber),
    onSuccess: (data) => {
      console.log("OTP request successful:", data);
      setIsLoading(false);
      setPhoneNumber(data.phoneNumber);
      
      toast({
        title: "Verification Code Sent",
        description: "Please check your phone for the verification code",
      });
      
      // Use wouter's navigation with a short timeout to ensure state updates first
      console.log("Navigating to /verify");
      setTimeout(() => {
        setLocation("/verify");
      }, 50);
    },
    onError: (error: any) => {
      console.error("OTP request failed:", error);
      setIsLoading(false);
      
      // Default error message
      let errorMessage = "Failed to send verification code";
      
      // Extract error message if available
      if (error?.status === 429) {
        errorMessage = "Too many verification attempts. Please try again later.";
      } else if (error?.status === 400) {
        errorMessage = "Invalid phone number format. Please enter a valid phone number.";
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

  const onSubmit = (values: LoginFormValues) => {
    setIsLoading(true);
    mutation.mutate(values);
  };

  return (
    <div className="w-full max-w-md mx-auto flex flex-col items-center">
      <div className="h-24 w-24 rounded-full bg-primary flex items-center justify-center mb-8">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      </div>
      
      <h1 className="text-2xl font-semibold mb-6">Welcome to WhatsPe</h1>
      <p className="text-center text-text-secondary dark:text-gray-400 mb-8">
        Simple, reliable, private messaging and calling for free, available all over the world.
      </p>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-6">
          <FormField
            control={form.control}
            name="phoneNumber"
            render={({ field }) => (
              <FormItem className="flex flex-col space-y-2">
                <FormLabel>Phone Number</FormLabel>
                <div className="flex">
                  <div className="bg-white dark:bg-gray-800 p-3 border border-gray-300 dark:border-gray-700 rounded-l">
                    <span>+1</span>
                  </div>
                  <FormControl>
                    <Input
                      type="tel"
                      placeholder="Enter your phone number"
                      className="flex-1 p-3 rounded-l-none"
                      {...field}
                    />
                  </FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <Button 
            type="submit" 
            className="w-full bg-primary hover:bg-primary-dark text-white py-3"
            disabled={isLoading}
          >
            {isLoading ? "Sending..." : "Next"}
          </Button>
        </form>
      </Form>
      
      <p className="mt-8 text-sm text-text-secondary dark:text-gray-400 text-center">
        By tapping Next, you agree to our <a href="#" className="text-primary">Terms of Service</a> and <a href="#" className="text-primary">Privacy Policy</a>
      </p>
    </div>
  );
}
