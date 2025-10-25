"use client"

import { useState } from "react"
import { Upload, FileText, Loader2 } from "lucide-react"
import { Card } from "@/components/ui/card"
import { toast } from "sonner"
import PDFUploader from "@/components/pdf-uploader"
import OCRResults from "@/components/ocr-results"

export default function Home() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [ocrResults, setOcrResults] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)

  const handleFileUpload = async (file: File) => {
    if (!file.type.includes("pdf") && !file.type.includes("image")) {
      toast.error("Please upload a PDF or image file")
      return
    }

    setIsProcessing(true)
    setFileName(file.name)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/ocr", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("OCR processing failed")
      }

      const data = await response.json()
      setOcrResults(data.text)
      toast.success("OCR processing completed successfully")
    } catch (error) {
      console.error("Error processing file:", error)
      toast.error("Failed to process file. Please try again.")
      setOcrResults(null)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <FileText className="w-10 h-10 text-blue-600" />
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900">OCR PDF Extractor</h1>
          </div>
          <p className="text-lg text-slate-600">Extract text from PDFs and images using advanced OCR technology</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Upload Section */}
          <div>
            <Card className="p-8 border-2 border-dashed border-blue-200 hover:border-blue-400 transition-colors">
              <PDFUploader onFileUpload={handleFileUpload} isProcessing={isProcessing} />
            </Card>

            {/* Processing Status */}
            {isProcessing && (
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                <div>
                  <p className="font-semibold text-blue-900">Processing...</p>
                  <p className="text-sm text-blue-700">{fileName}</p>
                </div>
              </div>
            )}
          </div>

          {/* Results Section */}
          <div>
            {ocrResults ? (
              <OCRResults
                text={ocrResults}
                fileName={fileName}
                onClear={() => {
                  setOcrResults(null)
                  setFileName(null)
                }}
              />
            ) : (
              <Card className="p-8 bg-slate-50 border-slate-200 h-full flex items-center justify-center">
                <div className="text-center">
                  <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">Upload a file to see extracted text here</p>
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* Features */}
        <div className="mt-16 grid md:grid-cols-3 gap-6">
          <Card className="p-6 bg-white">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <Upload className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-2">Easy Upload</h3>
            <p className="text-sm text-slate-600">Drag and drop or click to upload PDF and image files</p>
          </Card>

          <Card className="p-6 bg-white">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-2">Fast Processing</h3>
            <p className="text-sm text-slate-600">Advanced OCR technology extracts text quickly and accurately</p>
          </Card>

          <Card className="p-6 bg-white">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-2">Copy & Export</h3>
            <p className="text-sm text-slate-600">Easily copy extracted text or download as a file</p>
          </Card>
        </div>
      </div>
    </main>
  )
}
