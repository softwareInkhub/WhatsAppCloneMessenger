import React, { useState } from 'react';
import EmojiPickerReact, { Theme, EmojiStyle, EmojiClickData } from 'emoji-picker-react';
import { Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useTheme } from 'next-themes';
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
}

export function EmojiPicker({ onEmojiSelect }: EmojiPickerProps) {
  const [isDesktopPickerOpen, setIsDesktopPickerOpen] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const { theme } = useTheme();

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    onEmojiSelect(emojiData.emoji);
    setIsDesktopPickerOpen(false);
    setIsSheetOpen(false);
  };

  return (
    <>
      {/* Desktop emoji picker */}
      <div className="hidden md:block relative">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => setIsDesktopPickerOpen(!isDesktopPickerOpen)}
          title="Add emoji"
        >
          <Smile className="h-5 w-5" />
        </Button>
        
        {isDesktopPickerOpen && (
          <div 
            className="absolute bottom-12 right-0 z-50 shadow-lg rounded-lg overflow-hidden"
          >
            <EmojiPickerReact
              onEmojiClick={handleEmojiClick}
              theme={theme === 'dark' ? Theme.DARK : Theme.LIGHT}
              emojiStyle={EmojiStyle.NATIVE}
              height={350}
              width={320}
              lazyLoadEmojis={true}
              searchPlaceHolder="Search emoji..."
              previewConfig={{
                showPreview: true,
                defaultCaption: 'Choose your emoji...',
              }}
            />
          </div>
        )}
      </div>
      
      {/* Mobile emoji picker with bottom sheet */}
      <div className="md:hidden">
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon"
              title="Add emoji"
            >
              <Smile className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[50vh] p-0">
            <div className="h-full w-full">
              <EmojiPickerReact
                onEmojiClick={handleEmojiClick}
                theme={theme === 'dark' ? Theme.DARK : Theme.LIGHT}
                emojiStyle={EmojiStyle.NATIVE}
                height="100%"
                width="100%"
                lazyLoadEmojis={true}
                searchPlaceHolder="Search emoji..."
                previewConfig={{
                  showPreview: true,
                  defaultCaption: 'Choose your emoji...',
                }}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}