import { type NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"
export const maxDuration = 60

interface BatchOCRRequest {
  files: Array<{
    fileUrl: string
    fileName: string
  }>
  engine: "tesseract" | "ocrmypdf" | "paddleocr" | "easyocr"
  language?: string
  outputFormat?: "text" | "pdf" | "json" | "hocr"
}

export async function POST(request: NextRequest) {
  try {
    const body: BatchOCRRequest = await request.json()
    const { files, engine, language = "eng", outputFormat = "text" } = body

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 })
    }

    // Process all files in parallel
    const results = await Promise.allSettled(
      files.map(async (file) => {
        const response = await fetch(`${request.nextUrl.origin}/api/ocr/process`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileUrl: file.fileUrl,
            fileName: file.fileName,
            engine,
            language,
            outputFormat,
          }),
        })

        if (!response.ok) {
          throw new Error(`Failed to process ${file.fileName}`)
        }

        return await response.json()
      }),
    )

    const successful = results
      .filter((r) => r.status === "fulfilled")
      .map((r) => (r as PromiseFulfilledResult<any>).value)
    const failed = results.filter((r) => r.status === "rejected").map((r) => (r as PromiseRejectedResult).reason)

    return NextResponse.json({
      success: true,
      total: files.length,
      successful: successful.length,
      failed: failed.length,
      results: successful,
      errors: failed,
    })
  } catch (error) {
    console.error("[v0] Batch OCR error:", error)
    return NextResponse.json(
      { error: "Batch processing failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
