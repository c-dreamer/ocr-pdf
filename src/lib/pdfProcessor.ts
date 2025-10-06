import * as pdfjsLib from 'pdfjs-dist';
import { createWorker } from 'tesseract.js';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export interface PDFProcessResult {
  extractedText: string;
  ocrText: string;
  metadata: Record<string, any>;
  pageCount: number;
}

export const processPDF = async (
  file: File,
  onProgress?: (progress: number, status: 'extracting' | 'ocr' | 'complete') => void
): Promise<PDFProcessResult> => {
  // Extract text from PDF
  onProgress?.(20, 'extracting');
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  const metadata = await pdf.getMetadata();
  const pageCount = pdf.numPages;
  
  let extractedText = '';
  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');
    extractedText += `\n\n--- Page ${i} ---\n\n${pageText}`;
    onProgress?.(20 + (30 * i / pageCount), 'extracting');
  }
  
  // Perform OCR on first page as demo
  onProgress?.(50, 'ocr');
  let ocrText = '';
  try {
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (context) {
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      
      await page.render({
        canvasContext: context,
        viewport: viewport,
        canvas: canvas
      } as any).promise;
      
      onProgress?.(60, 'ocr');
      
      const worker = await createWorker('eng');
      const { data } = await worker.recognize(canvas);
      ocrText = data.text;
      await worker.terminate();
    }
  } catch (error) {
    console.error('OCR error:', error);
    ocrText = 'OCR processing failed. This might be a text-based PDF.';
  }
  
  onProgress?.(100, 'complete');
  
  return {
    extractedText: extractedText.trim(),
    ocrText: ocrText.trim(),
    metadata: metadata.info || {},
    pageCount
  };
};
