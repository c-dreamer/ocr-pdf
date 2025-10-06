import { Download, Copy, CheckCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card } from './ui/card';
import { useState } from 'react';
import { toast } from 'sonner';

interface ResultsPanelProps {
  extractedText: string;
  ocrText: string;
  metadata: Record<string, any>;
  fileName: string;
}

export const ResultsPanel = ({ extractedText, ocrText, metadata, fileName }: ResultsPanelProps) => {
  const [copiedTab, setCopiedTab] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  const handleCopy = (text: string, tab: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTab(tab);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedTab(null), 2000);
  };

  const handleDownload = (content: string, type: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName.replace('.pdf', '')}_${type}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Downloaded successfully!');
  };

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
        Extracted Results
      </h2>
      <Tabs defaultValue="text" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="text">Extracted Text</TabsTrigger>
          <TabsTrigger value="ocr">OCR Text</TabsTrigger>
          <TabsTrigger value="metadata">Metadata</TabsTrigger>
        </TabsList>
        <TabsContent value="text" className="space-y-4">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCopy(extractedText, 'text')}
              className="flex items-center gap-2"
            >
              {copiedTab === 'text' ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copiedTab === 'text' ? 'Copied!' : 'Copy'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDownload(extractedText, 'extracted')}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download
            </Button>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 max-h-96 overflow-y-auto">
            <pre className="text-sm whitespace-pre-wrap font-mono">{extractedText || 'No text extracted'}</pre>
          </div>
        </TabsContent>
        <TabsContent value="ocr" className="space-y-4">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCopy(ocrText, 'ocr')}
              className="flex items-center gap-2"
            >
              {copiedTab === 'ocr' ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copiedTab === 'ocr' ? 'Copied!' : 'Copy'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDownload(ocrText, 'ocr')}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download
            </Button>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 max-h-96 overflow-y-auto">
            <pre className="text-sm whitespace-pre-wrap font-mono">{ocrText || 'No OCR text available'}</pre>
          </div>
        </TabsContent>
        <TabsContent value="metadata" className="space-y-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleCopy(JSON.stringify(metadata, null, 2), 'metadata')}
            className="flex items-center gap-2"
          >
            {copiedTab === 'metadata' ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copiedTab === 'metadata' ? 'Copied!' : 'Copy'}
          </Button>
          <div className="flex gap-2">
            <Button
              variant="default"
              size="sm"
              disabled={saving}
              onClick={async () => {
                setSaving(true);
                setSavedId(null);
                try {
                  // Attempt to get Clerk user id from global if available
                  // (A proper implementation should use Clerk React hooks server-side tokens)
                  // Fallback to 'anonymous'
                  // @ts-ignore
                  const clerkUser = window?.Clerk?.user?.id || (window as any)._clerk?.user?.id || 'anonymous';

                  const resp = await fetch('/api/save', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      userId: clerkUser,
                      fileName,
                      extractedText,
                      ocrText,
                      metadata
                    })
                  });
                  const json = await resp.json();
                  if (json?.success) setSavedId(json.id);
                  else throw new Error(json?.error || 'save failed');
                } catch (err: any) {
                  toast.error('Save failed: ' + (err?.message || err));
                } finally {
                  setSaving(false);
                }
              }}
            >
              {saving ? 'Saving...' : savedId ? `Saved (${savedId})` : 'Save to DB'}
            </Button>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 max-h-96 overflow-y-auto">
            <pre className="text-sm font-mono">{JSON.stringify(metadata, null, 2)}</pre>
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
};
