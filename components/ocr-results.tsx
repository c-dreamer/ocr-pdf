"use client"

import { useState } from "react"
import { Copy, Download, Trash2, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { toast } from "sonner"

interface OCRResultsProps {
  text: string
  fileName: string | null
  onClear: () => void
}

export default function OCRResults({ text, fileName, onClear }: OCRResultsProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success("Text copied to clipboard")
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast.error("Failed to copy text")
    }
  }

  const handleDownload = () => {
    const element = document.createElement("a")
    const file = new Blob([text], { type: "text/plain" })
    element.href = URL.createObjectURL(file)
    element.download = `${fileName?.replace(/\.[^/.]+$/, "") || "ocr-result"}.txt`
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
    toast.success("File downloaded successfully")
  }

  return (
    <Card className="p-8 bg-white h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-slate-900">Extracted Text</h3>
          {fileName && <p className="text-sm text-slate-600">{fileName}</p>}
        </div>
      </div>

      <div className="flex-1 bg-slate-50 rounded-lg p-4 mb-4 overflow-auto max-h-96 border border-slate-200">
        <p className="text-slate-700 whitespace-pre-wrap text-sm leading-relaxed">{text}</p>
      </div>

      <div className="flex gap-2">
        <Button onClick={handleCopy} variant="outline" className="flex-1 bg-transparent">
          {copied ? (
            <>
              <Check className="w-4 h-4 mr-2" />
              Copied
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 mr-2" />
              Copy
            </>
          )}
        </Button>

        <Button onClick={handleDownload} variant="outline" className="flex-1 bg-transparent">
          <Download className="w-4 h-4 mr-2" />
          Download
        </Button>

        <Button onClick={onClear} variant="outline" className="flex-1 bg-transparent">
          <Trash2 className="w-4 h-4 mr-2" />
          Clear
        </Button>
      </div>
    </Card>
  )
}
