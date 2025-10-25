"use client"

import type React from "react"

import { useRef } from "react"
import { Upload, File } from "lucide-react"
import { Button } from "@/components/ui/button"

interface PDFUploaderProps {
  onFileUpload: (file: File) => void
  isProcessing: boolean
}

export default function PDFUploader({ onFileUpload, isProcessing }: PDFUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const files = e.dataTransfer.files
    if (files.length > 0) {
      onFileUpload(files[0])
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files
    if (files && files.length > 0) {
      onFileUpload(files[0])
    }
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="flex flex-col items-center justify-center gap-4 cursor-pointer"
    >
      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
        <Upload className="w-8 h-8 text-blue-600" />
      </div>

      <div className="text-center">
        <h3 className="font-semibold text-slate-900 mb-1">Drag and drop your file</h3>
        <p className="text-sm text-slate-600 mb-4">or click to browse from your computer</p>
      </div>

      <Button
        onClick={() => fileInputRef.current?.click()}
        disabled={isProcessing}
        className="bg-blue-600 hover:bg-blue-700"
      >
        <File className="w-4 h-4 mr-2" />
        Select File
      </Button>

      <p className="text-xs text-slate-500">Supported formats: PDF, PNG, JPG, JPEG, GIF, WEBP</p>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.gif,.webp"
        onChange={handleFileSelect}
        className="hidden"
        disabled={isProcessing}
      />
    </div>
  )
}
