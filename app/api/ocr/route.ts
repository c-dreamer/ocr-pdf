import { type NextRequest, NextResponse } from "next/server"
import { execSync } from "child_process"
import { writeFileSync, mkdtempSync, existsSync, readFileSync, rmSync } from "fs"
import { join } from "path"
import { tmpdir } from "os"

export const runtime = "nodejs"
export const maxDuration = 60

export async function POST(request: NextRequest) {
  let tmpDir: string | null = null

  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const validTypes = [
      "image/jpeg", "image/png", "image/webp", "image/tiff",
      "application/pdf",
    ]
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload an image or PDF." },
        { status: 400 },
      )
    }

    // Write uploaded file to temp directory
    tmpDir = mkdtempSync(join(tmpdir(), "ocr-pdf-"))
    const inputPath = join(tmpDir, file.name)
    const outputDir = join(tmpDir, "output")

    const bytes = await file.arrayBuffer()
    writeFileSync(inputPath, Buffer.from(bytes))

    // Call Python ocr-pdf CLI
    const cmd = `ocr-pdf process "${inputPath}" -o "${outputDir}" 2>/dev/null`
    execSync(cmd, { timeout: 60_000, encoding: "utf-8" })

    // Read the output
    const mdFile = join(outputDir, file.name.replace(/\.[^/.]+$/, "") + ".md")
    let text = ""
    if (existsSync(mdFile)) {
      text = readFileSync(mdFile, "utf-8")
    }

    // Get quality info from a second call with verbose output
    let method = "pymupdf"
    let quality = 1.0
    try {
      const infoCmd = `ocr-pdf -v process "${inputPath}" 2>&1 | tail -5`
      const info = execSync(infoCmd, { timeout: 60_000, encoding: "utf-8" })
      // Parse quality from output like: "✓ Extracted (pymupdf, quality=1.00)"
      const methodMatch = info.match(/\((\w+),/)
      const qualityMatch = info.match(/quality=([\d.]+)/)
      if (methodMatch) method = methodMatch[1]
      if (qualityMatch) quality = Number.parseFloat(qualityMatch[1])
    } catch {
      // Non-critical: use defaults
    }

    return NextResponse.json({
      text: text.trim(),
      fileName: file.name,
      fileSize: file.size,
      method,
      quality,
      processingMethod: method,
    })
  } catch (error) {
    console.error("OCR Error:", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { error: `Failed to process file: ${message}` },
      { status: 500 },
    )
  } finally {
    if (tmpDir) {
      try { rmSync(tmpDir, { recursive: true, force: true }) } catch {}
    }
  }
}
