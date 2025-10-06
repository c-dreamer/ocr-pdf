import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UploadZoneProps {
  onFileSelect: (file: File) => void;
  isProcessing: boolean;
}

export const UploadZone = ({ onFileSelect, isProcessing }: UploadZoneProps) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onFileSelect(acceptedFiles[0]);
    }
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/gif': ['.gif'],
      'image/bmp': ['.bmp'],
      'image/webp': ['.webp']
    },
    maxFiles: 1,
    disabled: isProcessing
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "relative border-2 border-dashed rounded-2xl p-12 transition-all duration-300 cursor-pointer",
        "hover:border-primary hover:shadow-[var(--shadow-elegant)]",
        isDragActive && "border-primary bg-primary/5 scale-[1.02]",
        isProcessing && "opacity-50 cursor-not-allowed",
        !isDragActive && "border-border"
      )}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center justify-center gap-4 text-center">
        <div className={cn(
          "p-6 rounded-full bg-gradient-to-br from-primary/10 to-accent/10 transition-transform duration-300",
          isDragActive && "scale-110"
        )}>
          {isDragActive ? (
            <FileText className="w-12 h-12 text-primary animate-pulse" />
          ) : (
            <Upload className="w-12 h-12 text-primary" />
          )}
        </div>
        <div>
          <h3 className="text-xl font-semibold text-foreground mb-2">
            {isDragActive ? 'Drop your document here' : 'Upload Document'}
          </h3>
          <p className="text-muted-foreground">
            Drag and drop your file here, or click to browse
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Supports PDF, DOCX, XLSX, PPTX, and images (PNG, JPG, etc.)
          </p>
        </div>
      </div>
    </div>
  );
};
