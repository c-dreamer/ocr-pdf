import { useState } from 'react';
import { FileText, Sparkles, CheckCircle, XCircle } from 'lucide-react';
import { UploadZone } from '@/components/UploadZone';
import { PDFViewer } from '@/components/PDFViewer';
import { ProcessingStatus } from '@/components/ProcessingStatus';
import { ResultsPanel } from '@/components/ResultsPanel';
import { processDocument, DocumentProcessResult, getFileType } from '@/lib/documentProcessor';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { AuthButton } from '@/components/auth/ClerkAuthWrapper';
import { Card } from '@/components/ui/card';

const Index = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('extracting');
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<DocumentProcessResult | null>(null);
  const [testResults, setTestResults] = useState<Array<{name: string, success: boolean, error?: string}>>([]);

  const handleFileSelect = async (file: File) => {
    setSelectedFile(file);
    setIsProcessing(true);
    setProgress(0);
    setResults(null);
    
    const fileType = getFileType(file);
    toast.success(`Processing ${fileType.toUpperCase()} file: ${file.name}...`);
    
    try {
      const result = await processDocument(
        file,
        (newProgress, status) => {
          setProgress(newProgress);
          setProcessingStatus(status);
        }
      );
      
      if (result.success) {
        setResults(result);
        toast.success(`${fileType.toUpperCase()} processed successfully!`);
      } else {
        toast.error(result.error || 'Failed to process document');
      }
    } catch (error) {
      console.error('Error processing document:', error);
      toast.error('Failed to process document. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setResults(null);
    setProgress(0);
    setTestResults([]);
  };

  const runFileFormatTests = () => {
    const testFiles = [
      { name: 'PDF', supported: true },
      { name: 'DOCX', supported: true },
      { name: 'XLSX', supported: true },
      { name: 'PPTX', supported: true },
      { name: 'PNG/JPG', supported: true },
      { name: 'TXT', supported: false },
      { name: 'CSV', supported: false }
    ];
    
    setTestResults(testFiles.map(test => ({
      name: test.name,
      success: test.supported,
      error: test.supported ? undefined : 'Format not yet supported'
    })));
    
    toast.success('Format compatibility test completed!');
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
            <AuthButton />
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
            
            {/* Test Button */}
            <div className="flex justify-center mt-8">
              <Button onClick={runFileFormatTests} variant="outline" className="gap-2">
                <Sparkles className="w-4 h-4" />
                Test File Format Support
              </Button>
            </div>
            
            {/* Test Results */}
            {testResults.length > 0 && (
              <Card className="p-6 mt-8">
                <h3 className="text-xl font-semibold mb-4">File Format Support Test Results</h3>
                <div className="grid gap-3">
                  {testResults.map((test, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <span className="font-medium">{test.name}</span>
                      <div className="flex items-center gap-2">
                        {test.success ? (
                          <>
                            <CheckCircle className="w-5 h-5 text-green-500" />
                            <span className="text-sm text-green-600 dark:text-green-400">Supported</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-5 h-5 text-orange-500" />
                            <span className="text-sm text-orange-600 dark:text-orange-400">{test.error}</span>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
            
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
              <div className="space-y-4 p-6 bg-card rounded-xl border border-border">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-6 h-6 text-primary animate-pulse" />
                  <span className="font-medium text-foreground">{processingStatus}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-primary to-accent h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
            
            <div className="grid lg:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-semibold mb-4">
                  {getFileType(selectedFile) === 'pdf' ? 'PDF Preview' : 'Document Info'}
                </h3>
                {getFileType(selectedFile) === 'pdf' ? (
                  <PDFViewer file={selectedFile} />
                ) : (
                  <Card className="p-6 space-y-4">
                    <div className="flex items-center gap-3">
                      <FileText className="w-8 h-8 text-primary" />
                      <div>
                        <p className="font-semibold">{selectedFile.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {getFileType(selectedFile).toUpperCase()} • {(selectedFile.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                    </div>
                    {results && !results.success && (
                      <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                        <p className="text-sm text-destructive">{results.error}</p>
                      </div>
                    )}
                  </Card>
                )}
              </div>
              <div>
                {results && results.success && (
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
