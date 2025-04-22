import React from "react";
import MainLayout from "@/components/layout/MainLayout";
import LoginForm from "@/components/auth/LoginForm";

export default function Login() {
  return (
    <MainLayout>
      <div className="min-h-screen flex flex-col items-center p-4 pt-16">
        <LoginForm />
      </div>
    </MainLayout>
  );
}
