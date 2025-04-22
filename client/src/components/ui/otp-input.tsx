import React, { useState, useRef, KeyboardEvent, ClipboardEvent, useEffect } from "react";
import { Input } from "./input";

interface OTPInputProps {
  length?: number;
  onComplete?: (otp: string) => void;
  onChange?: (otp: string) => void;
  disabled?: boolean;
}

export function OTPInput({
  length = 6,
  onComplete,
  onChange,
  disabled = false,
}: OTPInputProps) {
  const [otp, setOtp] = useState<string[]>(Array(length).fill(""));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Initialize refs array
  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, length);
  }, [length]);

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const value = e.target.value;
    if (isNaN(Number(value))) return; // Only allow numbers

    // Update OTP array
    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);

    // Call onChange callback
    if (onChange) {
      onChange(newOtp.join(""));
    }

    // Move to next input if current input is filled
    if (value && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Call onComplete if all inputs are filled
    const otpValue = newOtp.join("");
    if (otpValue.length === length && onComplete) {
      onComplete(otpValue);
    }
  };

  // Handle key press
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, index: number) => {
    // Move focus to previous input on backspace if current is empty
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }

    // Move focus on arrow keys
    if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowRight" && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle paste
  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text/plain").slice(0, length);
    
    if (!/^\d+$/.test(pasteData)) return; // Only allow numbers

    const newOtp = [...otp];
    
    for (let i = 0; i < pasteData.length; i++) {
      newOtp[i] = pasteData[i];
    }
    
    setOtp(newOtp);
    
    // Focus on appropriate input after paste
    if (pasteData.length === length) {
      inputRefs.current[length - 1]?.focus();
    } else {
      inputRefs.current[pasteData.length]?.focus();
    }
    
    // Call callbacks
    if (onChange) {
      onChange(newOtp.join(""));
    }
    
    if (pasteData.length === length && onComplete) {
      onComplete(newOtp.join(""));
    }
  };

  return (
    <div className="flex justify-between gap-2">
      {Array.from({ length }, (_, index) => (
        <Input
          key={index}
          ref={(el) => (inputRefs.current[index] = el)}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          className="w-12 h-12 text-center text-lg font-semibold"
          value={otp[index]}
          onChange={(e) => handleChange(e, index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          onPaste={handlePaste}
          disabled={disabled}
        />
      ))}
    </div>
  );
}
