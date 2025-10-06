import * as pdfjsLib from 'pdfjs-dist';
import { createWorker } from 'tesseract.js';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export interface DocumentProcessResult {
  extractedText: string;
  ocrText: string;
  metadata: Record<string, any>;
  fileType: string;
  pageCount?: number;
  success: boolean;
  error?: string;
}

export const getFileType = (file: File): string => {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  return ext;
};

// Process PDF files
const processPDFFile = async (
  file: File,
  onProgress?: (progress: number, status: string) => void
): Promise<DocumentProcessResult> => {
  onProgress?.(10, 'Loading PDF...');
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  const metadata = await pdf.getMetadata();
  const pageCount = pdf.numPages;
  
  onProgress?.(20, 'Extracting text from PDF...');
  let extractedText = '';
  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');
    extractedText += `\n\n--- Page ${i} ---\n\n${pageText}`;
    onProgress?.(20 + (40 * i / pageCount), `Extracting page ${i}/${pageCount}...`);
  }
  
  onProgress?.(60, 'Running OCR on first page...');
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
      
      const worker = await createWorker('eng');
      const { data } = await worker.recognize(canvas);
      ocrText = data.text;
      await worker.terminate();
    }
  } catch (error) {
    console.error('OCR error:', error);
    ocrText = 'OCR not available for this PDF';
  }
  
  onProgress?.(100, 'Complete!');
  
  return {
    extractedText: extractedText.trim(),
    ocrText: ocrText.trim(),
    metadata: metadata.info || {},
    fileType: 'pdf',
    pageCount,
    success: true
  };
};

// Process DOCX files
const processDOCXFile = async (
  file: File,
  onProgress?: (progress: number, status: string) => void
): Promise<DocumentProcessResult> => {
  onProgress?.(20, 'Loading DOCX...');
  const arrayBuffer = await file.arrayBuffer();
  
  onProgress?.(50, 'Extracting text from DOCX...');
  const result = await mammoth.extractRawText({ arrayBuffer });
  
  onProgress?.(100, 'Complete!');
  
  return {
    extractedText: result.value,
    ocrText: 'N/A - Text-based document',
    metadata: {
      fileName: file.name,
      fileSize: file.size,
      lastModified: new Date(file.lastModified).toISOString()
    },
    fileType: 'docx',
    success: true
  };
};

// Process XLSX files
const processXLSXFile = async (
  file: File,
  onProgress?: (progress: number, status: string) => void
): Promise<DocumentProcessResult> => {
  onProgress?.(20, 'Loading spreadsheet...');
  const arrayBuffer = await file.arrayBuffer();
  
  onProgress?.(50, 'Extracting data from spreadsheet...');
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  
  let extractedText = '';
  workbook.SheetNames.forEach((sheetName, index) => {
    const worksheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    extractedText += `\n\n--- Sheet: ${sheetName} ---\n\n${csv}`;
    onProgress?.(50 + (40 * (index + 1) / workbook.SheetNames.length), `Processing sheet ${index + 1}...`);
  });
  
  onProgress?.(100, 'Complete!');
  
  return {
    extractedText: extractedText.trim(),
    ocrText: 'N/A - Spreadsheet data',
    metadata: {
      fileName: file.name,
      fileSize: file.size,
      sheetCount: workbook.SheetNames.length,
      sheets: workbook.SheetNames
    },
    fileType: 'xlsx',
    success: true
  };
};

// Process PPTX files
const processPPTXFile = async (
  file: File,
  onProgress?: (progress: number, status: string) => void
): Promise<DocumentProcessResult> => {
  onProgress?.(20, 'Loading presentation...');
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);
  
  onProgress?.(50, 'Extracting text from slides...');
  let extractedText = '';
  let slideCount = 0;
  
  // Extract text from slide XML files
  const slideFiles = Object.keys(zip.files).filter(name => 
    name.startsWith('ppt/slides/slide') && name.endsWith('.xml')
  ).sort();
  
  for (let i = 0; i < slideFiles.length; i++) {
    const slideFile = zip.files[slideFiles[i]];
    const content = await slideFile.async('text');
    
    // Extract text from XML (simplified - removes tags)
    const textMatches = content.match(/<a:t>([^<]+)<\/a:t>/g);
    if (textMatches) {
      const slideText = textMatches
        .map(match => match.replace(/<\/?a:t>/g, ''))
        .join(' ');
      extractedText += `\n\n--- Slide ${i + 1} ---\n\n${slideText}`;
    }
    slideCount++;
    onProgress?.(50 + (40 * (i + 1) / slideFiles.length), `Processing slide ${i + 1}...`);
  }
  
  onProgress?.(100, 'Complete!');
  
  return {
    extractedText: extractedText.trim() || 'No text content found in presentation',
    ocrText: 'N/A - Presentation file',
    metadata: {
      fileName: file.name,
      fileSize: file.size,
      slideCount
    },
    fileType: 'pptx',
    pageCount: slideCount,
    success: true
  };
};

// Process image files with OCR
const processImageFile = async (
  file: File,
  onProgress?: (progress: number, status: string) => void
): Promise<DocumentProcessResult> => {
  onProgress?.(20, 'Loading image...');
  
  onProgress?.(50, 'Running OCR on image...');
  const worker = await createWorker('eng');
  const { data } = await worker.recognize(file);
  await worker.terminate();
  
  onProgress?.(100, 'Complete!');
  
  return {
    extractedText: data.text,
    ocrText: data.text,
    metadata: {
      fileName: file.name,
      fileSize: file.size,
      confidence: data.confidence
    },
    fileType: file.type,
    success: true
  };
};

// Main processor that routes to appropriate handler
export const processDocument = async (
  file: File,
  onProgress?: (progress: number, status: string) => void
): Promise<DocumentProcessResult> => {
  try {
    const fileType = getFileType(file);
    
    switch (fileType) {
      case 'pdf':
        return await processPDFFile(file, onProgress);
      case 'docx':
        return await processDOCXFile(file, onProgress);
      case 'xlsx':
      case 'xls':
        return await processXLSXFile(file, onProgress);
      case 'pptx':
        return await processPPTXFile(file, onProgress);
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'bmp':
      case 'webp':
        return await processImageFile(file, onProgress);
      default:
        return {
          extractedText: '',
          ocrText: '',
          metadata: {},
          fileType,
          success: false,
          error: `Unsupported file type: ${fileType}`
        };
    }
  } catch (error) {
    console.error('Document processing error:', error);
    return {
      extractedText: '',
      ocrText: '',
      metadata: {},
      fileType: getFileType(file),
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};
