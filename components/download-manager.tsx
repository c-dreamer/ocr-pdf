"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Download, FileText, Loader2 } from "lucide-react"
import { ocrClient } from "@/lib/ocr-client"
import { useToast } from "@/hooks/use-toast"

interface DownloadManagerProps {
  fileName: string
  fileUrl: string
  ocrText?: string
}

export function DownloadManager({ fileName, fileUrl, ocrText }: DownloadManagerProps) {
  const [isConverting, setIsConverting] = useState(false)
  const [selectedFormat, setSelectedFormat] = useState<"pdf" | "docx" | "txt" | "odt" | "pptx">("txt")
  const [isOpen, setIsOpen] = useState(false)
  const { toast } = useToast()

  const handleDownload = async () => {
    if (!ocrText && selectedFormat !== "pdf") {
      toast({
        title: "No OCR text available",
        description: "Please process the file with OCR first.",
        variant: "destructive",
      })
      return
    }

    setIsConverting(true)

    try {
      const blob = await ocrClient.convertFile(fileUrl, fileName, selectedFormat, ocrText)

      // Create download link
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${fileName.replace(/\.[^/.]+$/, "")}.${selectedFormat}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast({
        title: "Download started",
        description: `File converted to ${selectedFormat.toUpperCase()} and downloading.`,
      })

      setIsOpen(false)
    } catch (error) {
      toast({
        title: "Conversion failed",
        description: error instanceof Error ? error.message : "Failed to convert file",
        variant: "destructive",
      })
    } finally {
      setIsConverting(false)
    }
  }

  const formatDescriptions: Record<string, string> = {
    txt: "Plain text file - Simple and universal",
    pdf: "PDF document - Preserves formatting",
    docx: "Microsoft Word - Editable document",
    odt: "OpenDocument Text - Open standard",
    pptx: "PowerPoint - Presentation format",
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Download As...
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Download & Convert</DialogTitle>
          <DialogDescription>Choose a format to download your processed document</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Output Format</label>
            <Select value={selectedFormat} onValueChange={(value: any) => setSelectedFormat(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="txt">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span>Text (.txt)</span>
                  </div>
                </SelectItem>
                <SelectItem value="pdf">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span>PDF (.pdf)</span>
                  </div>
                </SelectItem>
                <SelectItem value="docx">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span>Word (.docx)</span>
                  </div>
                </SelectItem>
                <SelectItem value="odt">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span>OpenDocument (.odt)</span>
                  </div>
                </SelectItem>
                <SelectItem value="pptx">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span>PowerPoint (.pptx)</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{formatDescriptions[selectedFormat]}</p>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">File Information</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Original:</span>
                <span className="font-medium">{fileName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Output:</span>
                <span className="font-medium">
                  {fileName.replace(/\.[^/.]+$/, "")}.{selectedFormat}
                </span>
              </div>
              {ocrText && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Text Length:</span>
                  <span className="font-medium">{ocrText.length} characters</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Button className="w-full" onClick={handleDownload} disabled={isConverting}>
            {isConverting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Converting...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Download {selectedFormat.toUpperCase()}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
