# OCR-PDF - Advanced Document Processing

A powerful Next.js application for extracting text from documents using multiple OCR engines. Supports PDF, images, and various document formats with easy upload/download capabilities.

## Features

- **Multiple OCR Engines**: Tesseract.js, OCRmyPDF, PaddleOCR, and EasyOCR support
- **Multi-Format Support**: Process PDF, PNG, JPG, TIFF, BMP, DOCX, PPTX, ODT, and TXT files
- **Batch Processing**: Upload and process multiple files simultaneously
- **Format Conversion**: Download results as TXT, PDF, DOCX, ODT, or PPTX
- **Multi-Language**: Support for English, Spanish, French, German, Chinese, Japanese, and Arabic
- **Real-time Processing**: Live status updates and progress tracking
- **Modern UI**: Built with shadcn/ui components and Tailwind CSS

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **UI**: shadcn/ui + Tailwind CSS v4
- **OCR**: Tesseract.js, pdf-parse
- **Document Processing**: PDFKit, docx, pptxgenjs
- **Storage**: Vercel Blob
- **TypeScript**: Full type safety

## Getting Started

### Prerequisites

- Node.js 18+ or pnpm
- Vercel account (for Blob storage)

### Installation

1. Clone the repository:
\`\`\`bash
git clone https://github.com/yourusername/ocr-pdf.git
cd ocr-pdf
\`\`\`

2. Install dependencies:
\`\`\`bash
npm install
# or
pnpm install
\`\`\`

3. Set up environment variables:
\`\`\`bash
# Create .env.local file
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token
\`\`\`

4. Run the development server:
\`\`\`bash
npm run dev
# or
pnpm dev
\`\`\`

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Basic OCR Processing

1. **Upload Files**: Drag and drop or click to select files (PDF, images, documents)
2. **Configure Settings**: Choose OCR engine, language, and output format
3. **Process**: Click "Process Files" to extract text
4. **Download**: View results and download in your preferred format

### Supported File Types

- **Images**: PNG, JPG, JPEG, TIFF, BMP
- **Documents**: PDF, DOCX, PPTX, ODT, TXT
- **Max Size**: 50MB per file
- **Batch Limit**: 20 files at once

### OCR Engines

- **Tesseract.js**: Fast, browser-based OCR (default)
- **OCRmyPDF**: Enhanced PDF text extraction
- **PaddleOCR**: Advanced Chinese/multilingual support (requires Python backend)
- **EasyOCR**: High-accuracy OCR (requires Python backend)

### Output Formats

- **Plain Text**: Simple .txt file
- **JSON**: Detailed OCR data with confidence scores
- **hOCR**: HTML-based OCR format
- **PDF**: Searchable PDF with embedded text
- **DOCX**: Editable Microsoft Word document
- **PPTX**: PowerPoint presentation
- **ODT**: OpenDocument text format

## API Routes

### POST /api/upload
Upload files to Vercel Blob storage.

### POST /api/ocr/process
Process a single file with OCR.

\`\`\`typescript
{
  "fileUrl": "https://...",
  "fileName": "document.pdf",
  "engine": "tesseract",
  "language": "eng",
  "outputFormat": "text"
}
\`\`\`

### POST /api/ocr/batch
Process multiple files in batch.

### POST /api/convert
Convert processed files to different formats.

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import your repository in Vercel
3. Add environment variables:
   - `BLOB_READ_WRITE_TOKEN`: Vercel Blob storage token
4. Deploy

### GitHub Actions (Optional)

The project includes GitHub Actions workflow for CI/CD:
- Automatic testing on push
- Deployment to Vercel on merge to main

## Project Structure

\`\`\`
ocr-pdf/
├── app/
│   ├── api/
│   │   ├── upload/          # File upload endpoint
│   │   ├── ocr/
│   │   │   ├── process/     # Single file OCR
│   │   │   └── batch/       # Batch OCR processing
│   │   └── convert/         # Format conversion
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── file-upload.tsx      # Drag-and-drop upload
│   ├── ocr-dashboard.tsx    # Main dashboard
│   ├── download-manager.tsx # Format conversion UI
│   └── ui/                  # shadcn/ui components
├── lib/
│   ├── ocr-client.ts        # OCR API client
│   └── utils.ts
└── public/
\`\`\`

## Authentication (Clerk Integration)

This project is designed to work with Clerk authentication. To integrate:

1. Install Clerk:
\`\`\`bash
npm install @clerk/nextjs
\`\`\`

2. Add Clerk environment variables:
\`\`\`bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_key
CLERK_SECRET_KEY=your_secret
\`\`\`

3. Wrap your app with ClerkProvider in `app/layout.tsx`

4. Add authentication middleware in `middleware.ts`

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- Open an issue on GitHub
- Contact: your-email@example.com

## Roadmap

- [ ] Add Python backend for full PaddleOCR/EasyOCR support
- [ ] Implement user authentication with Clerk
- [ ] Add document history and management
- [ ] Support for more languages
- [ ] Advanced PDF editing features
- [ ] Cloud storage integration (S3, Google Drive)
- [ ] API rate limiting and usage tracking
- [ ] Mobile app version

## Acknowledgments

- Tesseract.js for browser-based OCR
- shadcn/ui for beautiful components
- Vercel for hosting and Blob storage
\`\`\`

```json file="" isHidden
