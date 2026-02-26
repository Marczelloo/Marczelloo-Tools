"use client";

import { useCallback, useRef, useState } from "react";
import { Cloud, FileVideo } from "lucide-react";

interface TactileDropzoneProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSize?: number;
  currentFile: File | null;
  maxSizeLabel?: string;
  fileTypesLabel?: string;
}

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

export function TactileDropzone({
  onFileSelect,
  accept = "video/*",
  maxSize: _maxSize,
  currentFile,
  maxSizeLabel = "Max 200MB",
  fileTypesLabel,
}: TactileDropzoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);
  const [isDragging, setIsDragging] = useState(false);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fileInputRef.current?.click();
    }
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  }, [onFileSelect]);

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

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  }, [onFileSelect]);

  const baseClasses = "border-2 rounded-lg p-8 text-center cursor-pointer transition-all duration-200";
  const stateClasses = isDragging
    ? "bg-white/10 border-white/40"
    : currentFile
    ? "bg-zinc-900/50 border-solid border-white/15"
    : "bg-zinc-900/50 border-dashed border-white/10 hover:border-white/30 hover:bg-white/5";

  const dropzoneId = useRef(`tactile-dropzone-${Math.random().toString(36).substring(2, 9)}`).current;
  const descriptionId = `${dropzoneId}-description`;

  return (
    <div
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      tabIndex={0}
      role="button"
      aria-label={currentFile ? `Change file: ${currentFile.name}` : "Select file to upload"}
      aria-describedby={descriptionId}
      className={`${baseClasses} ${stateClasses}`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
      />

      {currentFile ? (
        <div className="flex items-center justify-center gap-3">
          <FileVideo className="w-5 h-5 text-zinc-400" />
          <div>
            <p className="text-white font-medium">{currentFile.name}</p>
            <p id={descriptionId} className="text-sm text-zinc-500 mt-0.5">{formatSize(currentFile.size)}</p>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex justify-center mb-4">
            <div className="bg-black border border-white/10 rounded-full p-4">
              <Cloud className="w-6 h-6 text-zinc-400" strokeWidth={1.5} />
            </div>
          </div>
          <p className="text-zinc-300">Click to select or drop video</p>
          {fileTypesLabel && (
            <p id={descriptionId} className="text-xs text-zinc-500 mt-1">
              {fileTypesLabel} • {maxSizeLabel}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
