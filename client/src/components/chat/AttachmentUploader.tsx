import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Paperclip, X, File, Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface AttachmentUploaderProps {
  onFileSelect: (file: File) => void;
  isUploading?: boolean;
  uploadProgress?: number;
}

export function AttachmentUploader({ onFileSelect, isUploading = false, uploadProgress = 0 }: AttachmentUploaderProps) {
  const [isOpen, setIsOpen] = useState(false);
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

  return (
    <>
      <Button 
        variant="ghost" 
        size="icon"
        onClick={() => setIsOpen(true)}
        disabled={isUploading}
        title="Attach file"
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
          </DialogHeader>
          
          {!previewFile ? (
            <>
              {/* Desktop drag & drop area */}
              <div className="hidden md:block">
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
              </div>
              
              {/* Mobile-optimized buttons */}
              <div className="md:hidden space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.capture = 'environment'; // Use the back camera
                      input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file) onDrop([file]);
                      };
                      input.click();
                    }}
                    className="flex flex-col items-center justify-center p-4 border rounded-lg bg-gray-50 dark:bg-gray-800"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-2 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                      <circle cx="12" cy="13" r="4"></circle>
                    </svg>
                    <span className="text-sm font-medium">Take Photo</span>
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
                    className="flex flex-col items-center justify-center p-4 border rounded-lg bg-gray-50 dark:bg-gray-800"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-2 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                      <circle cx="8.5" cy="8.5" r="1.5"></circle>
                      <polyline points="21 15 16 10 5 21"></polyline>
                    </svg>
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
                  className="flex justify-center items-center w-full p-3 border rounded-lg bg-gray-50 dark:bg-gray-800"
                >
                  <File className="h-5 w-5 mr-2 text-primary" />
                  <span className="text-sm font-medium">Other Files</span>
                </button>
                
                <p className="text-xs text-center text-gray-400 mt-1">
                  Maximum file size: 10MB
                </p>
              </div>
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