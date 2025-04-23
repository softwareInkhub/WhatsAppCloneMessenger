import React, { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Paperclip, X, File, Upload, Loader2, ImageIcon, Music, Video, FileText, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { DialogDescription } from '@/components/ui/dialog';
import { useMediaQuery } from '@/hooks/use-media-query';
import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerClose,
} from '@/components/ui/drawer';

interface AttachmentUploaderProps {
  onFileSelect: (file: File) => void;
  isUploading?: boolean;
  uploadProgress?: number;
}

export function AttachmentUploader({ onFileSelect, isUploading = false, uploadProgress = 0 }: AttachmentUploaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ file: File; preview: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'camera' | 'gallery'>('upload');
  const isMobile = useMediaQuery("(max-width: 640px)");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  
  // Handle file selection from any source
  const handleFileSelection = useCallback((file: File) => {
    // Create a preview for image files
    if (file.type.startsWith('image/')) {
      const preview = URL.createObjectURL(file);
      setPreviewFile({ file, preview });
    } else {
      setPreviewFile({ file, preview: '' });
    }
  }, []);

  // Handle files from drag and drop or file browser
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    handleFileSelection(acceptedFiles[0]);
  }, [handleFileSelection]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    maxFiles: 1,
    maxSize: 10485760, // 10MB
  });

  // Handle specific camera capture
  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelection(e.target.files[0]);
    }
  };

  // Handle gallery selection
  const handleGallerySelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelection(e.target.files[0]);
    }
  };

  // Trigger camera input
  const openCamera = () => {
    if (cameraInputRef.current) {
      cameraInputRef.current.click();
    }
    setActiveTab('camera');
  };

  // Trigger gallery input
  const openGallery = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
    setActiveTab('gallery');
  };

  const handleSubmit = () => {
    if (previewFile) {
      onFileSelect(previewFile.file);
      setIsOpen(false);
      // Keep the file selected until upload is complete
      if (!isUploading) {
        setPreviewFile(null);
      }
    }
  };

  const handleCancel = () => {
    setIsOpen(false);
    setPreviewFile(null);
    setActiveTab('upload');
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return previewFile?.preview ? (
        <img 
          src={previewFile.preview} 
          alt="Preview" 
          className="max-h-56 max-w-full rounded-lg object-contain"
        />
      ) : <ImageIcon className="h-12 w-12 text-gray-400" />;
    }
    
    if (file.type.startsWith('video/')) {
      return <Video className="h-12 w-12 text-gray-400" />;
    }
    
    if (file.type.startsWith('audio/')) {
      return <Music className="h-12 w-12 text-gray-400" />;
    }
    
    return <FileText className="h-12 w-12 text-gray-400" />;
  };

  // Common hidden inputs for file selection
  const hiddenInputs = (
    <>
      {/* Hidden input for gallery selection */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/*,video/*,audio/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={handleGallerySelect}
      />
      
      {/* Hidden input for camera capture on mobile */}
      <input
        ref={cameraInputRef}
        type="file"
        className="hidden"
        accept="image/*"
        capture="environment"
        onChange={handleCameraCapture}
      />
    </>
  );

  // Content to show when no file is selected
  const uploadContent = (
    <>
      {/* Mobile specific controls */}
      {isMobile && (
        <div className="mb-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex">
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex-1 py-2 font-medium text-sm text-center ${
                activeTab === 'upload'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              Upload
            </button>
            <button
              onClick={openCamera}
              className={`flex-1 py-2 font-medium text-sm text-center ${
                activeTab === 'camera'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              Camera
            </button>
            <button
              onClick={openGallery}
              className={`flex-1 py-2 font-medium text-sm text-center ${
                activeTab === 'gallery'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              Gallery
            </button>
          </div>
        </div>
      )}
      
      {/* File upload area */}
      <div 
        {...getRootProps()} 
        className={`
          border-2 border-dashed rounded-lg p-4 sm:p-6 text-center cursor-pointer
          transition-colors duration-200 ease-in-out
          ${isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300 dark:border-gray-600'}
          hover:border-primary hover:bg-primary/5
        `}
      >
        <input {...getInputProps()} />
        <Upload className="h-10 w-10 mx-auto mb-2 text-gray-400" />
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {isMobile 
            ? 'Tap to browse files' 
            : 'Drag and drop a file here, or click to select'}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Maximum file size: 10MB
        </p>
      </div>
      
      {/* Mobile-specific quick actions */}
      {isMobile && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Button 
            variant="outline" 
            className="flex items-center justify-center space-x-2" 
            onClick={openCamera}
          >
            <Camera className="h-4 w-4" />
            <span>Camera</span>
          </Button>
          <Button 
            variant="outline" 
            className="flex items-center justify-center space-x-2" 
            onClick={openGallery}
          >
            <ImageIcon className="h-4 w-4" />
            <span>Gallery</span>
          </Button>
        </div>
      )}
    </>
  );

  // Content to show when a file is selected
  const previewContent = previewFile ? (
    <div className="space-y-4">
      <div className="flex flex-col items-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="mb-3">
          {getFileIcon(previewFile.file)}
        </div>
        <div className="w-full truncate text-center">
          <p className="font-medium truncate">{previewFile.file.name}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {(previewFile.file.size / 1024 / 1024).toFixed(2)} MB
          </p>
        </div>
      </div>
      
      {isUploading && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Uploading...</span>
            <span>{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} className="h-2" />
        </div>
      )}
    </div>
  ) : null;

  // Footer buttons
  const footerButtons = (
    <div className="flex justify-between w-full">
      <Button 
        variant="outline" 
        onClick={handleCancel}
        disabled={isUploading}
      >
        Cancel
      </Button>
      {previewFile && (
        <Button 
          onClick={handleSubmit} 
          disabled={isUploading}
        >
          {isUploading ? 'Uploading...' : 'Send'}
        </Button>
      )}
    </div>
  );

  // Mobile view with drawer
  if (isMobile) {
    return (
      <>
        {hiddenInputs}
        <Drawer open={isOpen} onOpenChange={setIsOpen}>
          <DrawerTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setIsOpen(true)}
              disabled={isUploading}
              title="Attach file"
              className="h-9 w-9"
            >
              {isUploading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Paperclip className="h-5 w-5" />
              )}
            </Button>
          </DrawerTrigger>
          <DrawerContent className="h-[85vh] px-4">
            <DrawerHeader className="p-4 pb-2">
              <DrawerTitle>Attach File</DrawerTitle>
            </DrawerHeader>
            
            <div className="flex-1 overflow-auto pb-4 px-1">
              {!previewFile ? uploadContent : previewContent}
            </div>
            
            <DrawerFooter className="pt-2 pb-8">
              {footerButtons}
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  // Desktop view
  return (
    <>
      {hiddenInputs}
      <Button 
        variant="ghost" 
        size="icon"
        onClick={() => setIsOpen(true)}
        disabled={isUploading}
        title="Attach file"
        className="h-10 w-10"
      >
        {isUploading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Paperclip className="h-5 w-5" />
        )}
      </Button>

      <Drawer open={isOpen} onOpenChange={setIsOpen}>
        <DrawerContent className="max-w-md mx-auto rounded-t-lg">
          <DrawerHeader>
            <DrawerTitle>Upload Attachment</DrawerTitle>
          </DrawerHeader>
          
          <div className="p-4 pt-0">
            {!previewFile ? uploadContent : previewContent}
          </div>
          
          <DrawerFooter>
            {footerButtons}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}