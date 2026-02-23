"use client";

import { useState, useCallback, useRef, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Upload } from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

interface FileDropZoneProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSize?: number;
  currentFile?: File | null;
  fileType: "video" | "audio" | "image" | "document" | "any";
  maxFileSizeLabel?: string;
  className?: string;
  children?: ReactNode;
}

// ============================================================================
// FILE TYPE CONFIGS
// ============================================================================

const fileTypeConfig = {
  video: { accept: "video/*", maxSize: 200 * 1024 * 1024, maxSizeLabel: "Max 200MB", label: "video" },
  audio: { accept: "audio/*", maxSize: 100 * 1024 * 1024, maxSizeLabel: "Max 100MB", label: "audio" },
  image: { accept: "image/*", maxSize: 50 * 1024 * 1024, maxSizeLabel: "Max 50MB", label: "image" },
  document: { accept: ".pdf,.doc,.docx,.txt,.rtf", maxSize: 50 * 1024 * 1024, maxSizeLabel: "Max 50MB", label: "document" },
  any: { accept: "*", maxSize: 200 * 1024 * 1024, maxSizeLabel: "Max 200MB", label: "file" },
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function FileDropZone({
  onFileSelect,
  accept,
  maxSize,
  currentFile,
  fileType,
  maxFileSizeLabel,
  className,
  children,
}: FileDropZoneProps): React.JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragError, setDragError] = useState<string | null>(null);

  const config = fileTypeConfig[fileType];
  const actualAccept = accept || config.accept;
  const actualMaxSize = maxSize || config.maxSize;
  const actualMaxSizeLabel = maxFileSizeLabel || config.maxSizeLabel;

  const validateAndSelectFile = useCallback(
    (file: File) => {
      setDragError(null);
      if (file.size > actualMaxSize) {
        setDragError(`File is too large. Maximum size is ${formatSize(actualMaxSize)}.`);
        return;
      }
      onFileSelect(file);
    },
    [actualMaxSize, onFileSelect]
  );

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) validateAndSelectFile(file);
    },
    [validateAndSelectFile]
  );

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current = 0;
      setIsDragging(false);

      const file = e.dataTransfer.files?.[0];
      if (file) validateAndSelectFile(file);
    },
    [validateAndSelectFile]
  );

  return (
    <div className={cn("space-y-2", className)}>
      <div
        onClick={handleClick}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={cn(
          "relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors duration-150",
          isDragging ? "border-white/30 bg-white/5" : "border-white/10 hover:border-white/20"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={actualAccept}
          onChange={handleChange}
          className="hidden"
        />

        {/* Default/Current file state */}
        {!isDragging && (
          currentFile ? (
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2">
                <Upload className="w-5 h-5 text-zinc-400" />
                <p className="text-white font-medium">{currentFile.name}</p>
              </div>
              <p className="text-sm text-zinc-500">{formatSize(currentFile.size)}</p>
              <p className="text-xs text-zinc-600">Click or drop to replace</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-center">
                <div className="w-12 h-12 rounded-full flex items-center justify-center bg-white/5">
                  <Upload className="w-6 h-6 text-zinc-400" />
                </div>
              </div>
              <div>
                <p className="text-zinc-300 font-medium">Click or drag {config.label} here</p>
                <p className="text-xs text-zinc-500 mt-1">{actualMaxSizeLabel}</p>
              </div>
            </div>
          )
        )}

        {/* Drag overlay */}
        {isDragging && (
          <div className="absolute -inset-[2px] rounded-lg flex items-center justify-center bg-white/5">
            <div className="text-center">
              <Upload className="w-10 h-10 mx-auto mb-2 text-white" />
              <p className="font-medium text-white">Drop to upload</p>
            </div>
          </div>
        )}
      </div>

      {dragError && <p className="text-sm text-zinc-400">{dragError}</p>}
      {children}
    </div>
  );
}

export default FileDropZone;
