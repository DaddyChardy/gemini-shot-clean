import { useCallback, useState } from "react";
import { Upload, Image as ImageIcon, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
}

export const FileUploader = ({ onFileSelect }: FileUploaderProps) => {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateFile = (file: File): string | null => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!allowedTypes.includes(file.type)) {
      return 'Please upload a JPEG, PNG, or WebP image.';
    }

    if (file.size > maxSize) {
      return 'File size must be less than 10MB.';
    }

    return null;
  };

  const handleFile = (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    onFileSelect(file);
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      <Card
        className={`upload-zone p-12 text-center cursor-pointer relative overflow-hidden ${
          dragActive ? 'drag-over' : ''
        }`}
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <input
          id="file-input"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleInputChange}
          className="hidden"
        />
        
        <div className="space-y-4">
          <div className="w-16 h-16 mx-auto bg-gradient-primary rounded-full flex items-center justify-center float-animation">
            {dragActive ? (
              <ImageIcon className="w-8 h-8 text-white" />
            ) : (
              <Upload className="w-8 h-8 text-white" />
            )}
          </div>
          
          <div className="space-y-2">
            <h3 className="text-xl font-semibold">
              {dragActive ? 'Drop your image here' : 'Upload your Gemini image'}
            </h3>
            <p className="text-muted-foreground">
              Drag & drop your image here, or click to browse
            </p>
            <p className="text-sm text-muted-foreground">
              Supports JPEG, PNG, WebP • Max 10MB
            </p>
          </div>
        </div>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
};