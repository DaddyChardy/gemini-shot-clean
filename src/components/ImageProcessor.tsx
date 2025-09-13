import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw, Check } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { loadImage, removeWatermarkFromBottomRight } from "@/lib/watermarkRemover";

interface ImageProcessorProps {
  file: File;
  onReset: () => void;
}

type ProcessingState = 'analyzing' | 'removing' | 'finalizing' | 'complete';

export const ImageProcessor = ({ file, onReset }: ImageProcessorProps) => {
  const [imageUrl, setImageUrl] = useState<string>("");
  const [processedUrl, setProcessedUrl] = useState<string>("");
  const [state, setState] = useState<ProcessingState>('analyzing');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Create URL for original image
    const url = URL.createObjectURL(file);
    setImageUrl(url);

    // Simulate processing steps
    simulateProcessing();

    return () => {
      URL.revokeObjectURL(url);
      if (processedUrl) {
        URL.revokeObjectURL(processedUrl);
      }
    };
  }, [file]);

  const simulateProcessing = async () => {
    try {
      // Step 1: Analyzing
      setState('analyzing');
      setProgress(0);
      await new Promise(resolve => setTimeout(resolve, 1000));
      setProgress(25);

      // Step 2: Removing watermark
      setState('removing');
      setProgress(50);
      
      // Load the image and process it
      const img = await loadImage(file);
      console.log('Image loaded, starting watermark removal...');
      
      const processedBlob = await removeWatermarkFromBottomRight(img);
      console.log('Watermark removal completed');
      
      setProgress(75);

      // Step 3: Finalizing
      setState('finalizing');
      await new Promise(resolve => setTimeout(resolve, 500));
      setProgress(90);

      // Create URL for processed image
      const processedUrl = URL.createObjectURL(processedBlob);
      setProcessedUrl(processedUrl);
      setState('complete');
      setProgress(100);
      toast.success("Watermark removed successfully!");
      
    } catch (error) {
      console.error('Processing failed:', error);
      setState('complete');
      setProgress(100);
      toast.error("Failed to remove watermark. Please try again.");
    }
  };

  const getStateText = () => {
    switch (state) {
      case 'analyzing': return 'Analyzing image and detecting watermark...';
      case 'removing': return 'Removing watermark with AI inpainting...';
      case 'finalizing': return 'Finalizing and optimizing image...';
      case 'complete': return 'Processing complete!';
    }
  };

  const handleDownload = () => {
    if (!processedUrl) return;

    const link = document.createElement('a');
    link.href = processedUrl;
    link.download = `${file.name.split('.')[0]}-cleaned.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("Image downloaded successfully!");
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Processing Status */}
      <Card className="p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center">
            {state === 'complete' ? (
              <Check className="w-6 h-6 text-white" />
            ) : (
              <RefreshCw className="w-6 h-6 text-white animate-spin" />
            )}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold">{getStateText()}</h3>
            <Progress value={progress} className="mt-2" />
          </div>
        </div>
      </Card>

      {/* Image Comparison */}
      <Card className="p-6">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Original Image */}
          <div className="space-y-3">
            <h4 className="font-medium text-center">Original</h4>
            <div className="relative rounded-lg overflow-hidden bg-muted aspect-video">
              {imageUrl && (
                <img
                  src={imageUrl}
                  alt="Original image"
                  className="w-full h-full object-contain"
                />
              )}
            </div>
          </div>

          {/* Processed Image */}
          <div className="space-y-3">
            <h4 className="font-medium text-center">Cleaned</h4>
            <div className="relative rounded-lg overflow-hidden bg-muted aspect-video">
              {processedUrl ? (
                <img
                  src={processedUrl}
                  alt="Processed image"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center processing-pulse">
                  <div className="text-muted-foreground">Processing...</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <Button
            onClick={handleDownload}
            disabled={state !== 'complete'}
            className="flex-1 bg-gradient-primary hover:opacity-90 text-white border-0 shadow-glow"
          >
            <Download className="w-4 h-4 mr-2" />
            Download Cleaned Image
          </Button>
          <Button
            variant="outline"
            onClick={onReset}
            className="flex-1"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Process Another Image
          </Button>
        </div>
      </Card>
    </div>
  );
};