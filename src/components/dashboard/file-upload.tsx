"use client";

import { useState, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, X, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { parseMultipleFiles, type ParsedFile } from "@/lib/kpi-parser";

interface FileStatus {
  file: File;
  status: "pending" | "parsing" | "success" | "error";
  message?: string;
}

interface FileUploadProps {
  onFilesParsed: (parsed: ParsedFile[]) => void;
}

export function FileUpload({ onFilesParsed }: FileUploadProps) {
  const [fileStatuses, setFileStatuses] = useState<FileStatus[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const xlsxFiles = Array.from(files).filter((f) =>
        f.name.endsWith(".xlsx")
      );
      if (xlsxFiles.length === 0) return;

      const newStatuses: FileStatus[] = xlsxFiles.map((f) => ({
        file: f,
        status: "parsing",
      }));
      setFileStatuses((prev) => [...prev, ...newStatuses]);

      try {
        const parsed = await parseMultipleFiles(xlsxFiles);

        // Map parsed results back to statuses
        const parsedFilenames = new Set(parsed.map((p) => p.filename));
        setFileStatuses((prev) =>
          prev.map((s) => {
            if (s.status !== "parsing") return s;
            if (parsedFilenames.has(s.file.name)) {
              return { ...s, status: "success", message: "Berhasil" };
            }
            return { ...s, status: "error", message: "Gagal parse" };
          })
        );

        if (parsed.length > 0) {
          onFilesParsed(parsed);
        }
      } catch {
        setFileStatuses((prev) =>
          prev.map((s) =>
            s.status === "parsing"
              ? { ...s, status: "error", message: "Error parsing" }
              : s
          )
        );
      }
    },
    [onFilesParsed]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const clearFiles = () => {
    setFileStatuses([]);
  };

  return (
    <Card>
      <CardContent className="p-4">
        {/* Drop Zone */}
        <div
          className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
            isDragging
              ? "border-emerald-500 bg-emerald-50"
              : "border-gray-300 hover:border-emerald-400 hover:bg-gray-50"
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <Upload
            className={`mx-auto h-8 w-8 mb-2 ${
              isDragging ? "text-emerald-500" : "text-muted-foreground"
            }`}
          />
          <p className="text-sm font-medium">
            {isDragging
              ? "Lepaskan file di sini..."
              : "Drag & drop file KPI (.xlsx)"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            atau klik untuk memilih file (mendukung banyak file sekaligus)
          </p>
        </div>

        {/* File List */}
        {fileStatuses.length > 0 && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">
                {fileStatuses.length} file dipilih
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
                onClick={clearFiles}
              >
                <X className="h-3 w-3 mr-1" />
                Hapus Semua
              </Button>
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1.5">
              {fileStatuses.map((fs, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-2 rounded-md bg-muted/50 text-xs"
                >
                  <FileSpreadsheet className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span className="flex-1 truncate font-medium">
                    {fs.file.name}
                  </span>
                  <span className="text-muted-foreground shrink-0">
                    {(fs.file.size / 1024).toFixed(1)} KB
                  </span>
                  {fs.status === "parsing" && (
                    <Loader2 className="h-4 w-4 text-amber-500 animate-spin shrink-0" />
                  )}
                  {fs.status === "success" && (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  )}
                  {fs.status === "error" && (
                    <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}