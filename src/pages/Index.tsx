import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { FileUploader } from "@/components/FileUploader";
import { ImageProcessor } from "@/components/ImageProcessor";

const Index = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
  };

  const handleReset = () => {
    setSelectedFile(null);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Remove <span className="gradient-text">Gemini Watermarks</span> Instantly
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Professional AI-powered watermark removal for Google Gemini images. 
            Upload your image and get a clean result in seconds.
          </p>
        </div>

        {!selectedFile ? (
          <FileUploader onFileSelect={handleFileSelect} />
        ) : (
          <ImageProcessor file={selectedFile} onReset={handleReset} />
        )}

        {/* Features Section */}
        <div className="mt-16 grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="text-center space-y-3">
            <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center mx-auto">
              <span className="text-white font-bold">AI</span>
            </div>
            <h3 className="font-semibold">AI-Powered</h3>
            <p className="text-sm text-muted-foreground">
              Advanced machine learning algorithms for precise watermark detection and removal
            </p>
          </div>
          
          <div className="text-center space-y-3">
            <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center mx-auto">
              <span className="text-white font-bold">⚡</span>
            </div>
            <h3 className="font-semibold">Lightning Fast</h3>
            <p className="text-sm text-muted-foreground">
              Process your images in under 10 seconds with our optimized processing pipeline
            </p>
          </div>
          
          <div className="text-center space-y-3">
            <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center mx-auto">
              <span className="text-white font-bold">🔒</span>
            </div>
            <h3 className="font-semibold">Privacy First</h3>
            <p className="text-sm text-muted-foreground">
              Your images are automatically deleted after processing. We never store your data
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Index;
