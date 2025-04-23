import React, { useState } from "react";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { registerUser } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const registrationSchema = z.object({
  username: z.string().min(3, {
    message: "Username must be at least 3 characters",
  }),
  email: z.string().email({
    message: "Please enter a valid email address",
  }),
  status: z.string().optional(),
  profilePicture: z.string().optional(),
});

type RegistrationFormValues = z.infer<typeof registrationSchema>;

export default function RegistrationForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const { phoneNumber, login } = useAuth();
  const { toast } = useToast();

  const form = useForm<RegistrationFormValues>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      username: "",
      email: "",
      status: "Hey, I'm using WhatsPe!",
      profilePicture: "",
    },
  });

  const mutation = useMutation({
    mutationFn: (userData: any) => registerUser(userData),
    onSuccess: (data) => {
      setIsLoading(false);
      login(data);
      console.log("Registration complete, navigating to /chat");
      setLocation("/chat");
      toast({
        title: "Registration Complete",
        description: "Your account has been created successfully",
      });
    },
    onError: (error: any) => {
      setIsLoading(false);
      
      // Check for specific error types from backend
      let errorMessage = "Failed to complete registration";
      
      if (error.status === 409) {
        // Conflict - resource already exists
        if (error.data?.error) {
          errorMessage = error.data.error;
        } else {
          errorMessage = "This phone number, email, or username is already registered";
        }
      } else if (error.data?.error) {
        errorMessage = error.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Registration Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: RegistrationFormValues) => {
    setIsLoading(true);
    
    if (!phoneNumber) {
      toast({
        title: "Error",
        description: "Phone number is required. Please restart the registration process.",
        variant: "destructive"
      });
      setIsLoading(false);
      return;
    }
    
    // Add phone number to the form data
    const userData = {
      ...values,
      phoneNumber,
      profilePicture: profileImage || values.profilePicture,
    };
    
    mutation.mutate(userData);
  };

  const handleProfilePictureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // In a real app, would upload to server and get URL
    // For now, create a data URL
    const reader = new FileReader();
    reader.onload = () => {
      setProfileImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const getInitials = (name: string) => {
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="w-full max-w-md mx-auto flex flex-col items-center">
      <h1 className="text-2xl font-semibold mb-2">Set up your profile</h1>
      <p className="text-center text-text-secondary dark:text-gray-400 mb-8">
        Please provide your details to complete the registration
      </p>
      
      <div className="mb-8">
        <div className="relative">
          <Avatar className="h-24 w-24">
            <AvatarImage src={profileImage || ""} alt="Profile picture" />
            <AvatarFallback className="text-xl">
              {form.watch("username") ? getInitials(form.watch("username")) : "👤"}
            </AvatarFallback>
          </Avatar>
          <Button 
            className="absolute bottom-0 right-0 bg-primary text-white rounded-full p-2 h-auto w-auto"
            onClick={() => document.getElementById("profile-picture-input")?.click()}
            type="button"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
              <circle cx="12" cy="13" r="4"></circle>
            </svg>
          </Button>
          <input 
            type="file" 
            id="profile-picture-input" 
            accept="image/*"
            className="hidden"
            onChange={handleProfilePictureUpload}
          />
        </div>
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-6">
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Username</FormLabel>
                <FormControl>
                  <Input placeholder="Choose a unique username" {...field} />
                </FormControl>
                <FormDescription>
                  This is how others will find you on WhatsPe
                </FormDescription>
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
                  <Input placeholder="Enter your email address" type="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <FormControl>
                  <Input placeholder="What's on your mind?" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <Button 
            type="submit" 
            className="w-full bg-primary hover:bg-primary-dark text-white py-3"
            disabled={isLoading}
          >
            {isLoading ? "Completing Registration..." : "Complete Registration"}
          </Button>
        </form>
      </Form>
    </div>
  );
}