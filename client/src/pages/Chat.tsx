import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useChat } from "@/contexts/ChatContext";
import { useIsMobile } from "@/hooks/use-mobile";
import MainLayout from "@/components/layout/MainLayout";
import Sidebar from "@/components/chat/Sidebar";
import ChatArea from "@/components/chat/ChatArea";
import AddContactModal from "@/components/chat/AddContactModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { User } from "@shared/schema";

export default function Chat() {
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const { isAuthenticated, currentUser, logout } = useAuth();
  const { setActiveContact, activeContact } = useChat();
  const [, setLocation] = useLocation();
  const isMobile = useIsMobile();
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, setLocation]);
  
  // Handle contact selection
  const handleSelectContact = (contact: User) => {
    setActiveContact(contact);
    if (isMobile) {
      // Hide sidebar on mobile when chat is opened
      const sidebar = document.querySelector("aside");
      const main = document.querySelector("main");
      if (sidebar && main) {
        sidebar.classList.add("hidden");
        main.classList.remove("hidden");
        main.classList.add("flex");
      }
    }
  };
  
  // Handle back to contacts on mobile
  const handleBackToContacts = () => {
    if (isMobile) {
      const sidebar = document.querySelector("aside");
      const main = document.querySelector("main");
      if (sidebar && main) {
        sidebar.classList.remove("hidden");
        main.classList.add("hidden");
      }
    }
  };
  
  // Handle logout
  const handleLogout = () => {
    logout();
    setLocation("/");
  };
  
  if (!isAuthenticated || !currentUser) {
    return null; // Will redirect in useEffect
  }
  
  return (
    <MainLayout>
      <div id="main-app" className="flex flex-col h-screen md:flex-row">
        {/* Sidebar (Contacts & Navigation) */}
        <Sidebar
          onAddContact={() => setShowAddContactModal(true)}
          onOpenSettings={() => setShowSettingsModal(true)}
          onSelectContact={handleSelectContact}
          isMobile={isMobile}
        />
        
        {/* Main Chat Area */}
        <ChatArea
          onBackToContacts={handleBackToContacts}
          isMobile={isMobile}
        />
        
        {/* Add Contact Modal */}
        <AddContactModal
          isOpen={showAddContactModal}
          onOpenChange={setShowAddContactModal}
        />
        
        {/* Settings Modal */}
        <Dialog open={showSettingsModal} onOpenChange={setShowSettingsModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Settings</DialogTitle>
            </DialogHeader>
            
            <div className="py-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Account</h3>
                  <p className="text-sm text-gray-500">{currentUser.username}</p>
                  <p className="text-xs text-gray-400">{currentUser.phoneNumber}</p>
                </div>
                <Button variant="outline" onClick={() => setShowSettingsModal(false)}>
                  Edit Profile
                </Button>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Theme</h3>
                  <p className="text-sm text-gray-500">Light mode</p>
                </div>
                <Button variant="outline" onClick={() => setShowSettingsModal(false)}>
                  Change
                </Button>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Privacy</h3>
                  <p className="text-sm text-gray-500">Manage your privacy settings</p>
                </div>
                <Button variant="outline" onClick={() => setShowSettingsModal(false)}>
                  Manage
                </Button>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="destructive" onClick={handleLogout}>
                Logout
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
