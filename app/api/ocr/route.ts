import { type NextRequest, NextResponse } from "next/server"
import Tesseract from "tesseract.js"
import pdfParse from "pdf-parse"
import * as pdfjsLib from "pdfjs-dist"

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/tiff", "application/pdf"]
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type. Please upload an image or PDF." }, { status: 400 })
    }

    console.log("[v0] Starting OCR processing for file:", file.name)

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    if (file.type === "application/pdf") {
      // Extract text directly from PDF using pdf-parse
      console.log("[v0] Processing PDF file")
      const pdfData = await pdfParse(buffer)
      const extractedText = pdfData.text

      console.log("[v0] PDF text extraction completed")

      return NextResponse.json({
        text: extractedText,
        fileName: file.name,
        fileSize: file.size,
        confidence: 100,
        language: "eng",
        processingMethod: "pdf-parse",
      })
    } else {
      // Use Tesseract for images
      console.log("[v0] Processing image file with Tesseract")
      const base64String = buffer.toString("base64")
      const dataUrl = `data:${file.type};base64,${base64String}`

      const result = await Tesseract.recognize(dataUrl, "eng", {
        logger: (m) => {
          console.log("[v0] Tesseract progress:", m.progress)
        },
      })

      const extractedText = result.data.text
      const confidence = result.data.confidence

      console.log("[v0] OCR completed. Confidence:", confidence)

      return NextResponse.json({
        text: extractedText,
        fileName: file.name,
        fileSize: file.size,
        confidence: confidence,
        language: "eng",
        processingMethod: "tesseract",
      })
    }
  } catch (error) {
    console.error("[v0] OCR Error:", error)
    return NextResponse.json(
      { error: "Failed to process file. Please try again with a different file." },
      { status: 500 },
    )
  }
}
