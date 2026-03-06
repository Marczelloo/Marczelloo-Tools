"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import { Cloud, FileVideo } from "lucide-react";

interface TactileDropzoneProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  currentFile: File | null;
  maxSizeLabel?: string;
  fileTypesLabel?: string;
  disabled?: boolean;
}

function formatSize(bytes: number): string {
  if (!bytes || bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

/**
 * Sanitize filename by removing HTTP header artifacts
 */
function sanitizeFilename(filename: string): string {
  if (!filename) return "Unknown";

  let clean = filename;

  // Remove patterns like "_; filename*=" or "; filename="
  clean = clean.split(/_;?\s*filename/i)[0] ?? clean;
  clean = clean.split(/;\s*filename/i)[0] ?? clean;

  // Remove UTF-8 prefix patterns
  clean = clean.replace(/UTF-8''/i, "");

  // Trim whitespace and trailing special characters
  clean = clean.trim().replace(/[_;,\s]+$/, "");

  return clean || "Unknown";
}

export function TactileDropzone({
  onFileSelect,
  accept = "video/*",
  currentFile,
  maxSizeLabel = "Max 200MB",
  fileTypesLabel,
  disabled = false,
}: TactileDropzoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);
  const [isDragging, setIsDragging] = useState(false);

  // Reset input when currentFile is cleared (allows re-selecting same file)
  useEffect(() => {
    if (!currentFile && fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [currentFile]);

  const handleClick = useCallback(() => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  }, [disabled]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!disabled && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      fileInputRef.current?.click();
    }
  }, [disabled]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  }, [onFileSelect, disabled]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, [disabled]);

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
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  }, [onFileSelect, disabled]);

  const baseClasses = "border-2 rounded-lg p-8 text-center transition-all duration-200";
  const stateClasses = disabled
    ? "bg-zinc-900/30 border-dashed border-white/5 cursor-not-allowed opacity-50"
    : isDragging
    ? "bg-white/10 border-white/40 cursor-pointer"
    : currentFile
    ? "bg-zinc-900/50 border-solid border-white/15 cursor-pointer"
    : "bg-zinc-900/50 border-dashed border-white/10 hover:border-white/30 hover:bg-white/5 cursor-pointer";

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
          <FileVideo className="w-5 h-5 text-zinc-400 flex-shrink-0" />
          <div className="min-w-0 text-center">
            <p className="text-white font-medium truncate max-w-xs" title={sanitizeFilename(currentFile.name)}>
              {sanitizeFilename(currentFile.name)}
            </p>
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
