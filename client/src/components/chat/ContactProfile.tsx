import React from 'react';
import { User } from '@shared/schema';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader,
  DialogTitle, 
  DialogDescription,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatLastSeen, formatPhoneNumber, getInitials } from '@/lib/utils';

interface ContactProfileProps {
  contact: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ContactProfile({ contact, open, onOpenChange }: ContactProfileProps) {
  if (!contact) return null;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Contact Profile</DialogTitle>
          <DialogDescription>
            View contact information
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col items-center py-4">
          <Avatar className="h-24 w-24 mb-4">
            <AvatarImage src={contact.profilePicture || ""} alt={contact.username} />
            <AvatarFallback className="text-xl">{getInitials(contact.username)}</AvatarFallback>
          </Avatar>
          
          <h3 className="text-xl font-bold mb-1">{contact.username}</h3>
          <p className="text-sm text-muted-foreground mb-4">{formatLastSeen(contact.lastSeen)}</p>
          
          <div className="w-full space-y-3 mt-2">
            <div className="flex items-center border-b pb-3">
              <div className="w-8">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium">Phone</p>
                <p className="text-sm text-muted-foreground">{formatPhoneNumber(contact.phoneNumber)}</p>
              </div>
            </div>
            
            {contact.email && (
              <div className="flex items-center border-b pb-3">
                <div className="w-8">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                    <polyline points="22,6 12,13 2,6"></polyline>
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">{contact.email}</p>
                </div>
              </div>
            )}
            
            <div className="flex items-center">
              <div className="w-8">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M12 16v-4M12 8h.01"></path>
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium">Status</p>
                <p className="text-sm text-muted-foreground">{contact.status || "Hey, I'm using WhatsApp!"}</p>
              </div>
            </div>
          </div>
        </div>
        
        <DialogFooter className="sm:justify-start">
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}