import { useState } from 'react';
import { FileText, Sparkles } from 'lucide-react';
import { UploadZone } from '@/components/UploadZone';
import { PDFViewer } from '@/components/PDFViewer';
import { ProcessingStatus } from '@/components/ProcessingStatus';
import { ResultsPanel } from '@/components/ResultsPanel';
import { processPDF, PDFProcessResult } from '@/lib/pdfProcessor';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

const Index = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<'extracting' | 'ocr' | 'complete'>('extracting');
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<PDFProcessResult | null>(null);

  const handleFileSelect = async (file: File) => {
    setSelectedFile(file);
    setIsProcessing(true);
    setProgress(0);
    setResults(null);
    
    toast.success(`Processing ${file.name}...`);
    
    try {
      const result = await processPDF(
        file,
        (newProgress, status) => {
          setProgress(newProgress);
          setProcessingStatus(status);
        }
      );
      
      setResults(result);
      toast.success('PDF processed successfully!');
    } catch (error) {
      console.error('Error processing PDF:', error);
      toast.error('Failed to process PDF. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setResults(null);
    setProgress(0);
  };

  return (
    <div className="min-h-screen bg-[var(--gradient-subtle)]">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-accent">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  PDF OCR Pro
                </h1>
                <p className="text-sm text-muted-foreground">Extract text with AI-powered OCR</p>
              </div>
            </div>
            <Button variant="outline" size="sm">
              Sign In with Clerk
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        {!selectedFile ? (
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12 space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
                <Sparkles className="w-4 h-4" />
                Powered by Advanced OCR Technology
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-foreground">
                Extract Text from Any PDF
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Upload your PDF documents and instantly extract text with our powerful OCR engine. 
                Perfect for scanned documents, images, and text-based PDFs.
              </p>
            </div>
            <UploadZone onFileSelect={handleFileSelect} isProcessing={isProcessing} />
            
            {/* Features */}
            <div className="grid md:grid-cols-3 gap-6 mt-16">
              <div className="p-6 rounded-xl bg-card border border-border hover:shadow-[var(--shadow-elegant)] transition-shadow">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Text Extraction</h3>
                <p className="text-muted-foreground text-sm">
                  Extract embedded text from PDFs instantly and accurately
                </p>
              </div>
              <div className="p-6 rounded-xl bg-card border border-border hover:shadow-[var(--shadow-elegant)] transition-shadow">
                <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                  <Sparkles className="w-6 h-6 text-accent" />
                </div>
                <h3 className="font-semibold text-lg mb-2">OCR Technology</h3>
                <p className="text-muted-foreground text-sm">
                  Advanced OCR for scanned documents and images
                </p>
              </div>
              <div className="p-6 rounded-xl bg-card border border-border hover:shadow-[var(--shadow-elegant)] transition-shadow">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Metadata Extraction</h3>
                <p className="text-muted-foreground text-sm">
                  Get detailed information about your PDF documents
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-bold text-foreground">Processing: {selectedFile.name}</h2>
              <Button onClick={handleReset} variant="outline">
                Process Another PDF
              </Button>
            </div>
            
            {isProcessing && (
              <ProcessingStatus status={processingStatus} progress={progress} />
            )}
            
            <div className="grid lg:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-semibold mb-4">PDF Preview</h3>
                <PDFViewer file={selectedFile} />
              </div>
              <div>
                {results && (
                  <ResultsPanel
                    extractedText={results.extractedText}
                    ocrText={results.ocrText}
                    metadata={results.metadata}
                    fileName={selectedFile.name}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
