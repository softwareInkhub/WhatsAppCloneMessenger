import React, { useState, useRef, useEffect } from 'react';
import EmojiPickerReact, { Theme, EmojiStyle, EmojiClickData } from 'emoji-picker-react';
import { Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
}

export function EmojiPicker({ onEmojiSelect }: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { theme } = useTheme();

  // Handle clicking outside to close the picker
  useEffect(() => {
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
  }, []);

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    onEmojiSelect(emojiData.emoji);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <Button 
        ref={buttonRef}
        variant="ghost" 
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        title="Add emoji"
      >
        <Smile className="h-5 w-5" />
      </Button>
      
      {isOpen && (
        <div 
          ref={pickerRef}
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
  );
}