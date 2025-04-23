import React, { useState, useRef, useEffect } from 'react';
import EmojiPickerReact, { Theme, EmojiStyle, EmojiClickData } from 'emoji-picker-react';
import { Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';
import { useMediaQuery } from '@/hooks/use-media-query';
import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from '@/components/ui/drawer';

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
}

export function EmojiPicker({ onEmojiSelect }: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const { theme } = useTheme();
  const isMobile = useMediaQuery("(max-width: 640px)");

  // Handle clicking outside to close the picker when not on mobile
  useEffect(() => {
    if (isMobile) return; // Skip for mobile as we use a drawer

    const handleClickOutside = (event: MouseEvent) => {
      if (
        pickerRef.current && 
        !pickerRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobile]);

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    onEmojiSelect(emojiData.emoji);
    setIsOpen(false);
  };

  // Common emoji picker configuration
  const emojiPickerElement = (
    <EmojiPickerReact
      onEmojiClick={handleEmojiClick}
      theme={theme === 'dark' ? Theme.DARK : Theme.LIGHT}
      emojiStyle={EmojiStyle.NATIVE}
      height={isMobile ? 300 : 350}
      width={isMobile ? "100%" : 320}
      lazyLoadEmojis={true}
      searchPlaceHolder="Search emoji..."
      previewConfig={{
        showPreview: !isMobile,
        defaultCaption: 'Choose your emoji...',
      }}
    />
  );

  // For mobile, we use a drawer that slides up from the bottom
  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={setIsOpen}>
        <DrawerTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setIsOpen(true)}
            title="Add emoji"
            className="h-9 w-9"
          >
            <Smile className="h-5 w-5" />
          </Button>
        </DrawerTrigger>
        <DrawerContent className="max-h-[65vh] px-0">
          <DrawerHeader className="px-4 py-2">
            <DrawerTitle>Select Emoji</DrawerTitle>
          </DrawerHeader>
          <div className="overflow-hidden">
            {emojiPickerElement}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  // For desktop, we show a popover
  return (
    <>
      <Button 
        ref={buttonRef}
        variant="ghost" 
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        title="Add emoji"
        className="h-10 w-10"
      >
        <Smile className="h-5 w-5" />
      </Button>
      
      {isOpen && (
        <div 
          ref={pickerRef}
          className="absolute bottom-12 left-0 z-50 shadow-lg rounded-lg overflow-hidden"
        >
          {emojiPickerElement}
        </div>
      )}
    </>
  );
}