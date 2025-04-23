import React, { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Paperclip, X, File, Upload, Loader2, ImageIcon, Music, Video, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useMediaQuery } from '@/hooks/use-media-query';

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

  return (
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
      
      {/* Attachment button */}
      <Button 
        variant="ghost" 
        size="icon"
        onClick={() => setIsOpen(true)}
        disabled={isUploading}
        title="Attach file"
        className="h-9 w-9 sm:h-10 sm:w-10"
      >
        {isUploading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Paperclip className="h-5 w-5" />
        )}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Attachment</DialogTitle>
            {isMobile && (
              <DialogDescription>
                Select a file to share
              </DialogDescription>
            )}
          </DialogHeader>
          
          {!previewFile ? (
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
              
              {/* File upload area (both mobile and desktop) */}
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
              
              {/* Mobile-specific buttons */}
              {isMobile && (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <Button 
                    variant="outline" 
                    className="flex items-center justify-center space-x-2" 
                    onClick={openCamera}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-camera"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
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
          ) : (
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
          )}
          
          <DialogFooter className="sm:justify-between">
            <Button 
              variant="outline" 
              onClick={handleCancel}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={!previewFile || isUploading}
            >
              {isUploading ? 'Uploading...' : 'Send'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}