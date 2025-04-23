import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Paperclip, X, File, Upload, Loader2, Camera, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetTrigger, SheetFooter } from '@/components/ui/sheet';

interface AttachmentUploaderProps {
  onFileSelect: (file: File) => void;
  isUploading?: boolean;
  uploadProgress?: number;
}

export function AttachmentUploader({ onFileSelect, isUploading = false, uploadProgress = 0 }: AttachmentUploaderProps) {
  const [isDesktopOpen, setIsDesktopOpen] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ file: File; preview: string } | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    const file = acceptedFiles[0];
    
    // Create a preview for image files
    if (file.type.startsWith('image/')) {
      const preview = URL.createObjectURL(file);
      setPreviewFile({ file, preview });
    } else {
      setPreviewFile({ file, preview: '' });
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({ 
    onDrop,
    maxFiles: 1,
    maxSize: 10485760, // 10MB,
    accept: {
      'image/*': [],
      'video/*': [],
      'audio/*': [],
      'application/pdf': [],
      'application/msword': [],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [],
      'text/plain': []
    }
  });

  const handleSubmit = () => {
    if (previewFile) {
      onFileSelect(previewFile.file);
      setIsDesktopOpen(false);
      setIsSheetOpen(false);
      // Keep the file selected until upload is complete
      if (!isUploading) {
        setPreviewFile(null);
      }
    }
  };

  const handleCancel = () => {
    setIsDesktopOpen(false);
    setIsSheetOpen(false);
    setPreviewFile(null);
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return previewFile?.preview ? (
        <img 
          src={previewFile.preview} 
          alt="Preview" 
          className="max-h-56 max-w-full rounded-lg object-contain"
        />
      ) : <File className="h-12 w-12 text-gray-400" />;
    }
    
    if (file.type.startsWith('video/')) {
      return <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>;
    }
    
    if (file.type.startsWith('audio/')) {
      return <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>;
    }
    
    return <File className="h-12 w-12 text-gray-400" />;
  };

  // Preview component used in both desktop and mobile views
  const FilePreview = () => (
    <div className="space-y-4">
      <div className="flex flex-col items-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="mb-3">
          {previewFile && getFileIcon(previewFile.file)}
        </div>
        {previewFile && (
          <div className="w-full truncate text-center">
            <p className="font-medium truncate">{previewFile.file.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {(previewFile.file.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
        )}
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
  );

  return (
    <>
      {/* Desktop View */}
      <div className="hidden md:block">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => setIsDesktopOpen(true)}
          disabled={isUploading}
          title="Attach file"
        >
          {isUploading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Paperclip className="h-5 w-5" />
          )}
        </Button>

        <Dialog open={isDesktopOpen} onOpenChange={setIsDesktopOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Upload Attachment</DialogTitle>
            </DialogHeader>
            
            {!previewFile ? (
              <div 
                {...getRootProps()} 
                className={`
                  border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
                  transition-colors duration-200 ease-in-out
                  ${isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300 dark:border-gray-600'}
                  hover:border-primary hover:bg-primary/5
                `}
              >
                <input {...getInputProps()} />
                <Upload className="h-10 w-10 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Drag and drop a file here, or click to select
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Maximum file size: 10MB
                </p>
              </div>
            ) : (
              <FilePreview />
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
      </div>

      {/* Mobile View */}
      <div className="md:hidden">
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon"
              disabled={isUploading}
              title="Attach file"
            >
              {isUploading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Paperclip className="h-5 w-5" />
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-auto">
            {!previewFile ? (
              <div className="space-y-6 py-6">
                <h3 className="text-lg font-medium text-center">Share Media</h3>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.capture = 'environment';
                      input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file) onDrop([file]);
                      };
                      input.click();
                    }}
                    className="flex flex-col items-center justify-center p-4 border rounded-xl bg-gray-50 dark:bg-gray-800"
                  >
                    <Camera className="h-10 w-10 mb-2 text-primary" />
                    <span className="text-sm font-medium">Camera</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*,video/*';
                      input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file) onDrop([file]);
                      };
                      input.click();
                    }}
                    className="flex flex-col items-center justify-center p-4 border rounded-xl bg-gray-50 dark:bg-gray-800"
                  >
                    <Image className="h-10 w-10 mb-2 text-primary" />
                    <span className="text-sm font-medium">Gallery</span>
                  </button>
                </div>
                
                <button
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'audio/*,application/pdf,text/plain';
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) onDrop([file]);
                    };
                    input.click();
                  }}
                  className="w-full flex justify-center items-center p-4 border rounded-xl bg-gray-50 dark:bg-gray-800"
                >
                  <File className="h-6 w-6 mr-2 text-primary" />
                  <span className="text-sm font-medium">Document</span>
                </button>
                
                <p className="text-xs text-center text-gray-500">
                  Maximum file size: 10MB
                </p>
              </div>
            ) : (
              <div className="py-6">
                <FilePreview />
                <div className="flex justify-end space-x-2 mt-6">
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
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}