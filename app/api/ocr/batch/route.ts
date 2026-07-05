import { type NextRequest, NextResponse } from "next/server"
import { execSync } from "child_process"
import { writeFileSync, mkdtempSync, existsSync, readdirSync, readFileSync, rmSync } from "fs"
import { join } from "path"
import { tmpdir } from "os"

export const runtime = "nodejs"
export const maxDuration = 120

export async function POST(request: NextRequest) {
  let tmpDir: string | null = null

  try {
    const formData = await request.formData()
    const files = formData.getAll("files") as File[]

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 })
    }

    if (files.length > 20) {
      return NextResponse.json({ error: "Maximum 20 files at once" }, { status: 400 })
    }

    // Write all files to temp directory
    tmpDir = mkdtempSync(join(tmpdir(), "ocr-pdf-batch-"))
    const inputDir = join(tmpDir, "input")
    const outputDir = join(tmpDir, "output")

    execSync(`mkdir -p "${inputDir}" "${outputDir}"`, { timeout: 5_000 })

    for (const file of files) {
      const bytes = await file.arrayBuffer()
      writeFileSync(join(inputDir, file.name), Buffer.from(bytes))
    }

    // Call Python ocr-pdf batch CLI
    const cmd = `ocr-pdf batch "${inputDir}" "${outputDir}" --workers 4 2>/dev/null`
    execSync(cmd, { timeout: 120_000, encoding: "utf-8" })

    // Collect results
    const results: Array<{
      fileName: string
      text: string
      method?: string
      quality?: number
      error?: string
    }> = []

    if (existsSync(outputDir)) {
      for (const mdFile of readdirSync(outputDir)) {
        if (!mdFile.endsWith(".md")) continue
        const text = readFileSync(join(outputDir, mdFile), "utf-8")
        results.push({
          fileName: mdFile.replace(/\.md$/, ""),
          text: text.trim(),
        })
      }
    }

    return NextResponse.json({
      processed: results.length,
      total: files.length,
      results,
    })
  } catch (error) {
    console.error("Batch OCR Error:", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { error: `Batch processing failed: ${message}` },
      { status: 500 },
    )
  } finally {
    if (tmpDir) {
      try { rmSync(tmpDir, { recursive: true, force: true }) } catch {}
    }
  }
}
