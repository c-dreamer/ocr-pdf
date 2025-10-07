"use client"

export interface OCRResult {
  success: boolean
  engine: string
  result: {
    text: string
    confidence?: number
    words?: Array<{ text: string; confidence: number; bbox: any }>
    lines?: Array<{ text: string; confidence: number; bbox: any }>
  }
  fileName: string
  timestamp: string
}

export interface BatchOCRResult {
  success: boolean
  total: number
  successful: number
  failed: number
  results: OCRResult[]
  errors: any[]
}

export class OCRClient {
  async processFile(
    fileUrl: string,
    fileName: string,
    engine: "tesseract" | "ocrmypdf" | "paddleocr" | "easyocr" = "tesseract",
    language = "eng",
    outputFormat: "text" | "pdf" | "json" | "hocr" = "text",
  ): Promise<OCRResult> {
    const response = await fetch("/api/ocr/process", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileUrl,
        fileName,
        engine,
        language,
        outputFormat,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "OCR processing failed")
    }

    return await response.json()
  }

  async processBatch(
    files: Array<{ fileUrl: string; fileName: string }>,
    engine: "tesseract" | "ocrmypdf" | "paddleocr" | "easyocr" = "tesseract",
    language = "eng",
    outputFormat: "text" | "pdf" | "json" | "hocr" = "text",
  ): Promise<BatchOCRResult> {
    const response = await fetch("/api/ocr/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        files,
        engine,
        language,
        outputFormat,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Batch OCR processing failed")
    }

    return await response.json()
  }

  async convertFile(
    fileUrl: string,
    fileName: string,
    targetFormat: "pdf" | "docx" | "txt" | "odt" | "pptx",
    ocrText?: string,
  ): Promise<Blob> {
    const response = await fetch("/api/convert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileUrl,
        fileName,
        targetFormat,
        ocrText,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Conversion failed")
    }

    return await response.blob()
  }
}

export const ocrClient = new OCRClient()
