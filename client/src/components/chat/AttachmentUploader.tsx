import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { X, Image, File, FilePlus, FileText, Music, Video, UploadCloud } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogFooter } from '@/components/ui/dialog';

interface AttachmentUploaderProps {
  onFileSelect: (file: File) => void;
  isUploading?: boolean;
  uploadProgress?: number;
}

export function AttachmentUploader({ onFileSelect, isUploading = false, uploadProgress = 0 }: AttachmentUploaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ file: File; preview: string } | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles?.length > 0) {
      const file = acceptedFiles[0]; // Just handle one file at a time for simplicity
      
      // Create preview for images
      if (file.type.startsWith('image/')) {
        const preview = URL.createObjectURL(file);
        setPreviewFile({ file, preview });
      } else {
        setPreviewFile({ file, preview: '' });
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': [],
      'audio/*': [],
      'video/*': [],
      'application/pdf': [],
      'application/msword': [],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [],
      'text/plain': [],
    },
    maxSize: 10485760, // 10MB
    multiple: false,
  });

  const handleClose = () => {
    setIsOpen(false);
    setPreviewFile(null);
  };

  const handleSend = () => {
    if (previewFile) {
      onFileSelect(previewFile.file);
      handleClose();
    }
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <Image className="h-8 w-8 text-blue-500" />;
    if (file.type.startsWith('audio/')) return <Music className="h-8 w-8 text-purple-500" />;
    if (file.type.startsWith('video/')) return <Video className="h-8 w-8 text-red-500" />;
    if (file.type.includes('pdf')) return <FileText className="h-8 w-8 text-orange-500" />;
    if (file.type.includes('word') || file.type.includes('document')) return <File className="h-8 w-8 text-blue-600" />;
    return <FilePlus className="h-8 w-8 text-gray-500" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' bytes';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  return (
    <>
      <Button 
        variant="ghost" 
        size="icon"
        onClick={() => setIsOpen(true)}
        title="Attach a file"
      >
        <FilePlus className="h-5 w-5" />
      </Button>
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Attachment</DialogTitle>
          </DialogHeader>
          
          <div className="p-4">
            {!previewFile ? (
              <div 
                {...getRootProps()} 
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300 dark:border-gray-600'
                }`}
              >
                <input {...getInputProps()} />
                <UploadCloud className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                  {isDragActive ? 'Drop the file here' : 'Drag & drop or click to select'}
                </p>
                <p className="text-xs text-gray-400">
                  Support images, videos, documents up to 10MB
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {previewFile.preview ? (
                  <div className="relative w-full rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                    <img 
                      src={previewFile.preview} 
                      alt="Preview" 
                      className="w-full max-h-60 object-contain" 
                    />
                    <button 
                      className="absolute top-2 right-2 bg-gray-900/60 text-white rounded-full p-1"
                      onClick={() => setPreviewFile(null)}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg flex items-center gap-3">
                    {getFileIcon(previewFile.file)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{previewFile.file.name}</p>
                      <p className="text-xs text-gray-500">{formatFileSize(previewFile.file.size)}</p>
                    </div>
                    <button 
                      className="text-gray-500 hover:text-gray-900 dark:hover:text-gray-300"
                      onClick={() => setPreviewFile(null)}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
                
                {isUploading && (
                  <div className="space-y-2">
                    <Progress value={uploadProgress} />
                    <p className="text-xs text-center text-gray-500">
                      Uploading... {uploadProgress}%
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <DialogFooter className="flex space-x-2 sm:justify-end">
            <Button 
              variant="outline" 
              onClick={handleClose}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={!previewFile || isUploading}
            >
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}