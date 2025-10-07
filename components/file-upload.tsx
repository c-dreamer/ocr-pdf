"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { Upload, X, FileText, ImageIcon, FileSpreadsheet, Presentation } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  url: string
  status: "uploading" | "uploaded" | "error"
  progress: number
}

interface FileUploadProps {
  onFilesUploaded?: (files: UploadedFile[]) => void
  maxFiles?: number
  maxSize?: number // in MB
}

const ACCEPTED_FILE_TYPES = {
  "application/pdf": [".pdf"],
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/tiff": [".tiff", ".tif"],
  "image/bmp": [".bmp"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
  "application/vnd.oasis.opendocument.text": [".odt"],
  "text/plain": [".txt"],
}

export function FileUpload({ onFilesUploaded, maxFiles = 10, maxSize = 50 }: FileUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const { toast } = useToast()

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return <ImageIcon className="h-8 w-8" />
    if (type.includes("pdf")) return <FileText className="h-8 w-8" />
    if (type.includes("spreadsheet")) return <FileSpreadsheet className="h-8 w-8" />
    if (type.includes("presentation")) return <Presentation className="h-8 w-8" />
    return <FileText className="h-8 w-8" />
  }

  const uploadFile = async (file: File): Promise<UploadedFile> => {
    const fileId = Math.random().toString(36).substring(7)

    const uploadedFile: UploadedFile = {
      id: fileId,
      name: file.name,
      size: file.size,
      type: file.type,
      url: "",
      status: "uploading",
      progress: 0,
    }

    setFiles((prev) => [...prev, uploadedFile])

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Upload failed")
      }

      const data = await response.json()

      const completedFile: UploadedFile = {
        ...uploadedFile,
        url: data.url,
        status: "uploaded",
        progress: 100,
      }

      setFiles((prev) => prev.map((f) => (f.id === fileId ? completedFile : f)))

      return completedFile
    } catch (error) {
      const errorFile: UploadedFile = {
        ...uploadedFile,
        status: "error",
        progress: 0,
      }

      setFiles((prev) => prev.map((f) => (f.id === fileId ? errorFile : f)))

      throw error
    }
  }

  const handleFiles = useCallback(
    async (fileList: FileList) => {
      const filesArray = Array.from(fileList)

      // Validate file count
      if (files.length + filesArray.length > maxFiles) {
        toast({
          title: "Too many files",
          description: `You can only upload up to ${maxFiles} files at once.`,
          variant: "destructive",
        })
        return
      }

      // Validate file types and sizes
      const validFiles = filesArray.filter((file) => {
        if (!Object.keys(ACCEPTED_FILE_TYPES).includes(file.type)) {
          toast({
            title: "Invalid file type",
            description: `${file.name} is not a supported file type.`,
            variant: "destructive",
          })
          return false
        }

        if (file.size > maxSize * 1024 * 1024) {
          toast({
            title: "File too large",
            description: `${file.name} exceeds the ${maxSize}MB size limit.`,
            variant: "destructive",
          })
          return false
        }

        return true
      })

      if (validFiles.length === 0) return

      try {
        const uploadedFiles = await Promise.all(validFiles.map(uploadFile))
        onFilesUploaded?.(uploadedFiles)

        toast({
          title: "Upload successful",
          description: `${uploadedFiles.length} file(s) uploaded successfully.`,
        })
      } catch (error) {
        toast({
          title: "Upload failed",
          description: "Some files failed to upload. Please try again.",
          variant: "destructive",
        })
      }
    },
    [files.length, maxFiles, maxSize, onFilesUploaded, toast],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      const droppedFiles = e.dataTransfer.files
      if (droppedFiles.length > 0) {
        handleFiles(droppedFiles)
      }
    },
    [handleFiles],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const removeFile = (fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
  }

  return (
    <div className="w-full space-y-4">
      <Card
        className={cn(
          "border-2 border-dashed transition-colors",
          isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25",
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <Upload className={cn("h-12 w-12 mb-4", isDragging ? "text-primary" : "text-muted-foreground")} />
          <h3 className="text-lg font-semibold mb-2">Drop files here or click to upload</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Supports PDF, Images (PNG, JPG, TIFF, BMP), DOCX, PPTX, ODT, TXT
          </p>
          <p className="text-xs text-muted-foreground mb-4">Maximum file size: {maxSize}MB</p>
          <Button
            onClick={() => {
              const input = document.createElement("input")
              input.type = "file"
              input.multiple = true
              input.accept = Object.values(ACCEPTED_FILE_TYPES).flat().join(",")
              input.onchange = (e) => {
                const target = e.target as HTMLInputElement
                if (target.files) {
                  handleFiles(target.files)
                }
              }
              input.click()
            }}
          >
            Select Files
          </Button>
        </div>
      </Card>

      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Uploaded Files ({files.length})</h4>
          {files.map((file) => (
            <Card key={file.id} className="p-4">
              <div className="flex items-center gap-4">
                <div className="text-muted-foreground">{getFileIcon(file.type)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                  {file.status === "uploading" && <Progress value={file.progress} className="mt-2 h-1" />}
                  {file.status === "error" && <p className="text-xs text-destructive mt-1">Upload failed</p>}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFile(file.id)}
                  disabled={file.status === "uploading"}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
