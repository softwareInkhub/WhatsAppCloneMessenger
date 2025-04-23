import React, { useState, useRef, useEffect } from 'react';
import EmojiPickerReact, { Theme, EmojiStyle, EmojiClickData } from 'emoji-picker-react';
import { Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useMediaQuery } from '@/hooks/use-media-query';

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
}

export function EmojiPicker({ onEmojiSelect }: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { theme } = useTheme();
  const isMobile = useMediaQuery("(max-width: 640px)");

  // Handle clicking outside to close the picker when not on mobile
  useEffect(() => {
    if (isMobile) return; // Skip for mobile as we use a dialog

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

  return (
    <>
      <Button 
        ref={buttonRef}
        variant="ghost" 
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        title="Add emoji"
        className="h-9 w-9 sm:h-10 sm:w-10"
      >
        <Smile className="h-5 w-5" />
      </Button>
      
      {/* Desktop emoji picker */}
      {!isMobile && isOpen && (
        <div 
          ref={pickerRef}
          className="absolute bottom-12 left-0 z-50 shadow-lg rounded-lg overflow-hidden"
        >
          {emojiPickerElement}
        </div>
      )}

      {/* Mobile emoji picker in a dialog */}
      {isMobile && (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="p-0 sm:max-w-md max-h-[90vh] overflow-hidden">
            <div className="w-full h-full">
              {emojiPickerElement}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}