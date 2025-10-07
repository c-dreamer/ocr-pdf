import { type NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"
export const maxDuration = 60

interface OCRRequest {
  fileUrl: string
  fileName: string
  engine: "tesseract" | "ocrmypdf" | "paddleocr" | "easyocr"
  language?: string
  outputFormat?: "text" | "pdf" | "json" | "hocr"
}

export async function POST(request: NextRequest) {
  try {
    const body: OCRRequest = await request.json()
    const { fileUrl, fileName, engine, language = "eng", outputFormat = "text" } = body

    if (!fileUrl || !fileName || !engine) {
      return NextResponse.json({ error: "Missing required fields: fileUrl, fileName, or engine" }, { status: 400 })
    }

    // Fetch the file from the URL
    const fileResponse = await fetch(fileUrl)
    if (!fileResponse.ok) {
      return NextResponse.json({ error: "Failed to fetch file" }, { status: 400 })
    }

    const fileBuffer = await fileResponse.arrayBuffer()
    const buffer = Buffer.from(fileBuffer)

    // Process based on engine
    let result
    switch (engine) {
      case "tesseract":
        result = await processTesseract(buffer, fileName, language, outputFormat)
        break
      case "ocrmypdf":
        result = await processOCRmyPDF(buffer, fileName, language, outputFormat)
        break
      case "paddleocr":
        result = await processPaddleOCR(buffer, fileName, language, outputFormat)
        break
      case "easyocr":
        result = await processEasyOCR(buffer, fileName, language, outputFormat)
        break
      default:
        return NextResponse.json({ error: "Invalid OCR engine" }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      engine,
      result,
      fileName,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[v0] OCR processing error:", error)
    return NextResponse.json(
      { error: "OCR processing failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}

async function processTesseract(buffer: Buffer, fileName: string, language: string, outputFormat: string) {
  // Tesseract.js implementation
  const Tesseract = await import("tesseract.js")

  const worker = await Tesseract.createWorker(language)

  try {
    const { data } = await worker.recognize(buffer)

    if (outputFormat === "json") {
      return {
        text: data.text,
        confidence: data.confidence,
        words: data.words.map((w) => ({
          text: w.text,
          confidence: w.confidence,
          bbox: w.bbox,
        })),
        lines: data.lines.map((l) => ({
          text: l.text,
          confidence: l.confidence,
          bbox: l.bbox,
        })),
      }
    } else if (outputFormat === "hocr") {
      return { hocr: data.hocr }
    }

    return { text: data.text, confidence: data.confidence }
  } finally {
    await worker.terminate()
  }
}

async function processOCRmyPDF(buffer: Buffer, fileName: string, language: string, outputFormat: string) {
  // OCRmyPDF simulation (would require Python backend in production)
  // For now, we'll use Tesseract as fallback with enhanced PDF handling
  const pdfParse = await import("pdf-parse")

  try {
    // First try to extract existing text
    const data = await pdfParse.default(buffer)

    if (data.text && data.text.trim().length > 0) {
      return {
        text: data.text,
        pages: data.numpages,
        info: data.info,
        method: "text-extraction",
      }
    }

    // If no text, fall back to OCR
    return await processTesseract(buffer, fileName, language, outputFormat)
  } catch (error) {
    console.error("[v0] OCRmyPDF processing error:", error)
    throw new Error("PDF processing failed")
  }
}

async function processPaddleOCR(buffer: Buffer, fileName: string, language: string, outputFormat: string) {
  // PaddleOCR simulation - would require Python backend
  // Using Tesseract as fallback with enhanced detection
  const result = await processTesseract(buffer, fileName, language, "json")

  return {
    ...result,
    engine: "paddleocr-fallback",
    note: "Using Tesseract engine. For full PaddleOCR support, deploy Python backend.",
  }
}

async function processEasyOCR(buffer: Buffer, fileName: string, language: string, outputFormat: string) {
  // EasyOCR simulation - would require Python backend
  // Using Tesseract as fallback
  const result = await processTesseract(buffer, fileName, language, "json")

  return {
    ...result,
    engine: "easyocr-fallback",
    note: "Using Tesseract engine. For full EasyOCR support, deploy Python backend.",
  }
}
