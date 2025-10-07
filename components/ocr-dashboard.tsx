"use client"

import { useState } from "react"
import { FileUpload } from "@/components/file-upload"
import { DownloadManager } from "@/components/download-manager"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { FileText, Loader2, CheckCircle2, XCircle, Copy } from "lucide-react"
import { ocrClient, type OCRResult } from "@/lib/ocr-client"
import { useToast } from "@/hooks/use-toast"

interface ProcessedFile {
  id: string
  fileName: string
  fileUrl: string
  status: "pending" | "processing" | "completed" | "error"
  result?: OCRResult
  error?: string
}

export function OCRDashboard() {
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ id: string; name: string; url: string }>>([])
  const [processedFiles, setProcessedFiles] = useState<ProcessedFile[]>([])
  const [selectedEngine, setSelectedEngine] = useState<"tesseract" | "ocrmypdf" | "paddleocr" | "easyocr">("tesseract")
  const [selectedLanguage, setSelectedLanguage] = useState("eng")
  const [outputFormat, setOutputFormat] = useState<"text" | "json" | "hocr">("text")
  const [isProcessing, setIsProcessing] = useState(false)
  const { toast } = useToast()

  const handleFilesUploaded = (files: any[]) => {
    const newFiles = files.map((file) => ({
      id: file.id,
      name: file.name,
      url: file.url,
    }))
    setUploadedFiles((prev) => [...prev, ...newFiles])
  }

  const processFiles = async () => {
    if (uploadedFiles.length === 0) {
      toast({
        title: "No files to process",
        description: "Please upload files first.",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)

    const filesToProcess: ProcessedFile[] = uploadedFiles.map((file) => ({
      id: file.id,
      fileName: file.name,
      fileUrl: file.url,
      status: "processing",
    }))

    setProcessedFiles(filesToProcess)

    for (const file of filesToProcess) {
      try {
        const result = await ocrClient.processFile(
          file.fileUrl,
          file.fileName,
          selectedEngine,
          selectedLanguage,
          outputFormat,
        )

        setProcessedFiles((prev) =>
          prev.map((f) =>
            f.id === file.id
              ? {
                  ...f,
                  status: "completed",
                  result,
                }
              : f,
          ),
        )
      } catch (error) {
        setProcessedFiles((prev) =>
          prev.map((f) =>
            f.id === file.id
              ? {
                  ...f,
                  status: "error",
                  error: error instanceof Error ? error.message : "Processing failed",
                }
              : f,
          ),
        )
      }
    }

    setIsProcessing(false)
    setUploadedFiles([])

    toast({
      title: "Processing complete",
      description: "All files have been processed.",
    })
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied to clipboard",
      description: "Text has been copied to your clipboard.",
    })
  }

  const downloadText = (text: string, fileName: string) => {
    const blob = new Blob([text], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${fileName.replace(/\.[^/.]+$/, "")}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const getStatusIcon = (status: ProcessedFile["status"]) => {
    switch (status) {
      case "processing":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return null
    }
  }

  const getStatusBadge = (status: ProcessedFile["status"]) => {
    const variants: Record<ProcessedFile["status"], "default" | "secondary" | "destructive"> = {
      pending: "secondary",
      processing: "default",
      completed: "default",
      error: "destructive",
    }

    return (
      <Badge variant={variants[status]} className="capitalize">
        {status}
      </Badge>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">OCR Processing Dashboard</h1>
        <p className="text-muted-foreground">Upload documents and extract text using advanced OCR engines</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Upload Files</CardTitle>
            <CardDescription>Upload PDF, images, or documents for OCR processing</CardDescription>
          </CardHeader>
          <CardContent>
            <FileUpload onFilesUploaded={handleFilesUploaded} maxFiles={20} maxSize={50} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>OCR Settings</CardTitle>
            <CardDescription>Configure processing options</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">OCR Engine</label>
              <Select value={selectedEngine} onValueChange={(value: any) => setSelectedEngine(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tesseract">Tesseract.js</SelectItem>
                  <SelectItem value="ocrmypdf">OCRmyPDF</SelectItem>
                  <SelectItem value="paddleocr">PaddleOCR</SelectItem>
                  <SelectItem value="easyocr">EasyOCR</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Language</label>
              <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="eng">English</SelectItem>
                  <SelectItem value="spa">Spanish</SelectItem>
                  <SelectItem value="fra">French</SelectItem>
                  <SelectItem value="deu">German</SelectItem>
                  <SelectItem value="chi_sim">Chinese (Simplified)</SelectItem>
                  <SelectItem value="jpn">Japanese</SelectItem>
                  <SelectItem value="ara">Arabic</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Output Format</label>
              <Select value={outputFormat} onValueChange={(value: any) => setOutputFormat(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Plain Text</SelectItem>
                  <SelectItem value="json">JSON (Detailed)</SelectItem>
                  <SelectItem value="hocr">hOCR</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <Button className="w-full" onClick={processFiles} disabled={uploadedFiles.length === 0 || isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Process Files ({uploadedFiles.length})
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {processedFiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Processing Results</CardTitle>
            <CardDescription>View and download extracted text</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="list" className="w-full">
              <TabsList>
                <TabsTrigger value="list">List View</TabsTrigger>
                <TabsTrigger value="detailed">Detailed View</TabsTrigger>
              </TabsList>

              <TabsContent value="list" className="space-y-4">
                {processedFiles.map((file) => (
                  <Card key={file.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(file.status)}
                          <div>
                            <p className="font-medium">{file.fileName}</p>
                            {file.result && (
                              <p className="text-sm text-muted-foreground">
                                Confidence: {file.result.result.confidence?.toFixed(2)}%
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(file.status)}
                          {file.status === "completed" && file.result && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => copyToClipboard(file.result!.result.text)}
                              >
                                <Copy className="h-4 w-4 mr-2" />
                                Copy
                              </Button>
                              <DownloadManager
                                fileName={file.fileName}
                                fileUrl={file.fileUrl}
                                ocrText={file.result.result.text}
                              />
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="detailed" className="space-y-4">
                {processedFiles.map((file) => (
                  <Card key={file.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{file.fileName}</CardTitle>
                        {getStatusBadge(file.status)}
                      </div>
                      {file.result && (
                        <CardDescription>
                          Engine: {file.result.engine} | Confidence: {file.result.result.confidence?.toFixed(2)}%
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      {file.status === "completed" && file.result && (
                        <div className="space-y-4">
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyToClipboard(file.result!.result.text)}
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              Copy Text
                            </Button>
                            <DownloadManager
                              fileName={file.fileName}
                              fileUrl={file.fileUrl}
                              ocrText={file.result.result.text}
                            />
                          </div>
                          <ScrollArea className="h-[300px] w-full rounded-md border p-4">
                            <pre className="text-sm whitespace-pre-wrap">{file.result.result.text}</pre>
                          </ScrollArea>
                        </div>
                      )}
                      {file.status === "error" && <div className="text-sm text-destructive">Error: {file.error}</div>}
                      {file.status === "processing" && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Processing file...
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
