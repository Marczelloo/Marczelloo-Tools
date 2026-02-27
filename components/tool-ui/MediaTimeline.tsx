"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Play, Pause, SkipBack, SkipForward, AlertCircle, Volume2, VolumeX } from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

interface MediaTimelineProps {
  file: File | null;
  type: "video" | "audio";
  startTime: number;
  endTime: number;
  onStartTimeChange: (time: number) => void;
  onEndTimeChange: (time: number) => void;
  className?: string;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// ============================================================================
// TIMELINE HANDLE COMPONENT
// ============================================================================

interface TimelineHandleProps {
  position: number;
  onPositionChange: (pos: number) => void;
  type: "start" | "end";
}

function TimelineHandle({ position, onPositionChange, type }: TimelineHandleProps): React.JSX.Element {
  const handleRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isDragging.current = true;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDragging.current) return;
      const timeline = handleRef.current?.parentElement;
      if (!timeline) return;
      const rect = timeline.getBoundingClientRect();
      const x = moveEvent.clientX - rect.left;
      const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
      onPositionChange(percent);
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, [onPositionChange]);

  return (
    <div
      ref={handleRef}
      className="absolute top-0 bottom-0 w-4 cursor-ew-resize z-10 group"
      style={{ left: `${position}%`, transform: "translateX(-50%)" }}
      onMouseDown={handleMouseDown}
    >
      <div className="absolute inset-y-0 w-0.5 left-1/2 -translate-x-1/2 bg-white" />
      <div className="absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-10 rounded-sm bg-white shadow-lg group-hover:scale-110 transition-transform" />
      <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-mono font-semibold whitespace-nowrap text-zinc-400">
        {type === "start" ? "START" : "END"}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function MediaTimeline({
  file,
  type,
  startTime,
  endTime,
  onStartTimeChange,
  onEndTimeChange,
  className,
}: MediaTimelineProps): React.JSX.Element | null {
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement>(null);
  const displayVideoRef = useRef<HTMLVideoElement>(null);
  const thumbnailVideoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Use refs to avoid stale closure issues
  const startTimeRef = useRef(startTime);
  const endTimeRef = useRef(endTime);
  const onStartTimeChangeRef = useRef(onStartTimeChange);
  const onEndTimeChangeRef = useRef(onEndTimeChange);

  // Keep refs updated
  useEffect(() => {
    startTimeRef.current = startTime;
    endTimeRef.current = endTime;
    onStartTimeChangeRef.current = onStartTimeChange;
    onEndTimeChangeRef.current = onEndTimeChange;
  });

  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [thumbnails, setThumbnails] = useState<string[]>([]);

  // Create object URL when file changes
  useEffect(() => {
    if (!file) {
      setMediaUrl(null);
      setThumbnails([]);
      return;
    }

    const url = URL.createObjectURL(file);
    setMediaUrl(url);
    setIsLoading(true);
    setError(null);
    setDuration(0);
    setCurrentTime(0);
    setIsPlaying(false);
    setThumbnails([]);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  // Generate video thumbnails
  const generateThumbnails = useCallback((videoDuration: number) => {
    if (type !== "video" || !thumbnailVideoRef.current || videoDuration <= 0) return;

    const video = thumbnailVideoRef.current;
    const numThumbnails = 8;
    const interval = videoDuration / numThumbnails;
    const generatedThumbnails: string[] = [];
    let currentThumbnail = 0;

    const captureFrame = () => {
      if (currentThumbnail >= numThumbnails) {
        setThumbnails(generatedThumbnails);
        return;
      }

      const time = currentThumbnail * interval;
      video.currentTime = time;
    };

    video.onseeked = () => {
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          canvas.width = 120;
          canvas.height = 68;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          generatedThumbnails.push(canvas.toDataURL("image/jpeg", 0.6));
        }
      }
      currentThumbnail++;
      captureFrame();
    };

    captureFrame();
  }, [type]);

  // Handle media events
  const handleMediaLoad = useCallback((d: number) => {
    if (isFinite(d) && d > 0) {
      setDuration(d);
      setIsLoading(false);
      setError(null);
      if (endTimeRef.current === 0) {
        onEndTimeChangeRef.current(d);
      }
      if (type === "video") {
        setTimeout(() => generateThumbnails(d), 100);
      }
    }
  }, [type, generateThumbnails]);

  const handleLoadedMetadata = useCallback(() => {
    const media = mediaRef.current;
    if (media) handleMediaLoad(media.duration);
  }, [handleMediaLoad]);

  const handleDurationChange = useCallback(() => {
    const media = mediaRef.current;
    if (media) handleMediaLoad(media.duration);
  }, [handleMediaLoad]);

  const handleCanPlay = useCallback(() => {
    const media = mediaRef.current;
    if (media && duration === 0) {
      handleMediaLoad(media.duration);
    }
  }, [duration, handleMediaLoad]);

  const handleError = useCallback((e: React.SyntheticEvent<HTMLVideoElement | HTMLAudioElement, Event>) => {
    const media = e.currentTarget;
    setIsLoading(false);
    if (media.error) {
      const errorMessages: Record<number, string> = {
        1: "Media loading aborted",
        2: "Network error while loading media",
        3: "Media decoding failed",
        4: "Media format not supported",
      };
      setError(errorMessages[media.error.code] || "Failed to load media file");
    }
  }, []);

  const handleTimeUpdate = useCallback(() => {
    const media = mediaRef.current;
    if (media) {
      setCurrentTime(media.currentTime);
    }
  }, []);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    const media = mediaRef.current;
    if (media) {
      media.currentTime = startTimeRef.current;
    }
  }, []);

  // Convert seconds to percentage
  const startPercent = duration > 0 ? (startTime / duration) * 100 : 0;
  const endPercent = duration > 0 ? (endTime / duration) * 100 : 100;
  const currentPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Handle position changes from handles
  const handleStartPosChange = useCallback(
    (percent: number) => {
      if (duration <= 0) return;
      const time = (percent / 100) * duration;
      onStartTimeChange(Math.max(0, Math.min(time, endTime - 0.1)));
    },
    [duration, endTime, onStartTimeChange]
  );

  const handleEndPosChange = useCallback(
    (percent: number) => {
      if (duration <= 0) return;
      const time = (percent / 100) * duration;
      onEndTimeChange(Math.max(startTime + 0.1, Math.min(time, duration)));
    },
    [duration, startTime, onEndTimeChange]
  );

  // Play/Pause toggle
  const togglePlay = useCallback(() => {
    const media = mediaRef.current;
    if (!media || duration <= 0) return;

    if (isPlaying) {
      media.pause();
      setIsPlaying(false);
    } else {
      if (currentTime < startTime || currentTime >= endTime) {
        media.currentTime = startTime;
      }
      media.play().catch(() => {
        setError("Failed to play media");
      });
      setIsPlaying(true);
    }
  }, [isPlaying, currentTime, startTime, endTime, duration]);

  // Skip controls
  const skipToStart = useCallback(() => {
    const media = mediaRef.current;
    if (media) {
      media.currentTime = startTime;
      setCurrentTime(startTime);
    }
  }, [startTime]);

  const skipToEnd = useCallback(() => {
    const media = mediaRef.current;
    if (media) {
      const time = Math.max(0, endTime - 0.5);
      media.currentTime = time;
      setCurrentTime(time);
    }
  }, [endTime]);

  // Click on timeline to seek
  const handleTimelineClick = useCallback(
    (e: React.MouseEvent) => {
      const media = mediaRef.current;
      if (!timelineRef.current || !media || duration <= 0) return;
      const rect = timelineRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percent = Math.max(0, Math.min(1, x / rect.width));
      const time = percent * duration;
      const clampedTime = Math.max(startTime, Math.min(endTime, time));
      media.currentTime = clampedTime;
      setCurrentTime(clampedTime);
    },
    [duration, startTime, endTime]
  );

  // Volume control
  const handleVolumeChange = useCallback((newVolume: number) => {
    const media = mediaRef.current;
    setVolume(newVolume);
    if (media) {
      media.volume = newVolume;
      media.muted = newVolume === 0;
      setIsMuted(newVolume === 0);
    }
  }, []);

  const toggleMute = useCallback(() => {
    const media = mediaRef.current;
    if (media) {
      const newMuted = !isMuted;
      media.muted = newMuted;
      setIsMuted(newMuted);
    }
  }, [isMuted]);

  // Sync display video with main media
  useEffect(() => {
    if (type === "video" && displayVideoRef.current && mediaUrl) {
      const displayVideo = displayVideoRef.current;
      const mainMedia = mediaRef.current;

      if (mainMedia) {
        if (isPlaying && displayVideo.paused) {
          displayVideo.currentTime = mainMedia.currentTime;
          displayVideo.play().catch(() => {});
        } else if (!isPlaying && !displayVideo.paused) {
          displayVideo.pause();
        }
        displayVideo.volume = volume;
        displayVideo.muted = isMuted;
      }
    }
  }, [isPlaying, mediaUrl, type, volume, isMuted]);

  // Sync current time
  useEffect(() => {
    if (type === "video" && displayVideoRef.current && mediaRef.current) {
      const displayVideo = displayVideoRef.current;
      const mainMedia = mediaRef.current;
      if (Math.abs(displayVideo.currentTime - mainMedia.currentTime) > 0.3) {
        displayVideo.currentTime = mainMedia.currentTime;
      }
    }
  }, [currentTime, type]);

  // Stop at end time
  useEffect(() => {
    if (isPlaying && currentTime >= endTime) {
      const media = mediaRef.current;
      if (media) {
        media.pause();
        media.currentTime = startTime;
        setIsPlaying(false);
      }
    }
  }, [currentTime, endTime, isPlaying, startTime]);

  // Apply volume to main media
  useEffect(() => {
    const media = mediaRef.current;
    if (media) {
      media.volume = volume;
      media.muted = isMuted;
    }
  }, [volume, isMuted]);

  if (!file || !mediaUrl) return null;

  const showContent = !isLoading && duration > 0;

  // Get the correct media element type
  const MediaElement = type === "video" ? "video" : "audio";

  return (
    <div className={cn("space-y-4", className)}>
      {/* Main media element (single source of truth for playback) */}
      <MediaElement
        ref={mediaRef as React.RefObject<HTMLVideoElement & HTMLAudioElement>}
        src={mediaUrl}
        onLoadedMetadata={handleLoadedMetadata}
        onDurationChange={handleDurationChange}
        onCanPlay={handleCanPlay}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onError={handleError}
        preload="auto"
        playsInline
        muted={false}
        className="sr-only"
        style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0,0,0,0)" }}
      />

      {/* Hidden video for thumbnail generation only */}
      {type === "video" && (
        <video
          ref={thumbnailVideoRef}
          src={mediaUrl}
          preload="auto"
          muted
          className="sr-only"
          style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0,0,0,0)" }}
        />
      )}

      {/* Hidden canvas for thumbnails */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Video Preview - syncs with main media */}
      {type === "video" && showContent && (
        <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
          <video
            ref={displayVideoRef}
            src={mediaUrl}
            className="w-full h-full object-contain"
            playsInline
            muted={isMuted}
          />
          {/* Time overlay */}
          <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/70 rounded text-xs font-mono text-white">
            {formatTime(currentTime)} / {formatTime(endTime)}
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-3 bg-zinc-900 border border-zinc-700 rounded-md flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-zinc-400 flex-shrink-0 mt-0.5" />
          <p className="text-zinc-300 text-sm">{error}</p>
        </div>
      )}

      {/* Timeline visualization */}
      <div className="space-y-2">
        {/* Time display */}
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="font-medium text-white">{formatTime(startTime)}</span>
          <span className="text-zinc-500 px-2 py-0.5 bg-zinc-900 rounded">
            Selection: {formatTime(endTime - startTime)}
          </span>
          <span className="font-medium text-white">{formatTime(endTime)}</span>
        </div>

        {/* Timeline track with thumbnails */}
        <div
          ref={timelineRef}
          className="relative h-16 bg-zinc-900 rounded-md border border-white/10 cursor-pointer overflow-hidden"
          onClick={handleTimelineClick}
        >
          {/* Thumbnail strip for video */}
          {type === "video" && thumbnails.length > 0 && (
            <div className="absolute inset-0 flex">
              {thumbnails.map((thumb, i) => (
                <img
                  key={i}
                  src={thumb}
                  alt=""
                  className="h-full object-cover flex-1 opacity-40"
                />
              ))}
            </div>
          )}

          {/* Dimmed areas outside selection */}
          {showContent && (
            <>
              <div
                className="absolute inset-y-0 left-0 bg-black/70"
                style={{ width: `${startPercent}%` }}
              />
              <div
                className="absolute inset-y-0 right-0 bg-black/70"
                style={{ width: `${100 - endPercent}%` }}
              />
            </>
          )}

          {/* Selection highlight */}
          {showContent && (
            <div
              className="absolute inset-y-0 border-2 border-white/20 bg-white/5"
              style={{
                left: `${startPercent}%`,
                right: `${100 - endPercent}%`,
              }}
            />
          )}

          {/* Playhead */}
          {showContent && (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-white z-[5] pointer-events-none"
              style={{ left: `${currentPercent}%` }}
            >
              <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-white rounded-full shadow" />
            </div>
          )}

          {/* Handles */}
          {showContent && (
            <>
              <TimelineHandle
                position={startPercent}
                onPositionChange={handleStartPosChange}
                type="start"
              />
              <TimelineHandle
                position={endPercent}
                onPositionChange={handleEndPosChange}
                type="end"
              />
            </>
          )}

          {/* Loading state */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />
                <span className="text-xs text-zinc-500">Loading media...</span>
              </div>
            </div>
          )}
        </div>

        {/* Full duration */}
        <div className="text-center text-xs text-zinc-500">
          Total duration: {formatTime(duration) || "loading..."}
        </div>
      </div>

      {/* Combined controls row */}
      <div className="flex items-center justify-between gap-4">
        {/* Current time display - LEFT */}
        <div className="flex items-baseline gap-1 min-w-[100px]">
          <span className="text-sm font-mono text-white">{formatTime(currentTime)}</span>
          <span className="text-zinc-600">/</span>
          <span className="text-sm font-mono text-zinc-500">{formatTime(endTime)}</span>
        </div>

        {/* Playback controls - CENTER */}
        <div className="flex items-center gap-2">
          <button
            onClick={skipToStart}
            disabled={!showContent}
            className="w-8 h-8 flex items-center justify-center rounded-md bg-zinc-900 border border-white/10 hover:bg-white/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Skip to start"
          >
            <SkipBack className="w-3.5 h-3.5 text-zinc-400" />
          </button>

          <button
            onClick={togglePlay}
            disabled={!showContent}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white text-black hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>

          <button
            onClick={skipToEnd}
            disabled={!showContent}
            className="w-8 h-8 flex items-center justify-center rounded-md bg-zinc-900 border border-white/10 hover:bg-white/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Skip to end"
          >
            <SkipForward className="w-3.5 h-3.5 text-zinc-400" />
          </button>
        </div>

        {/* Volume control - RIGHT */}
        <div className="flex items-center gap-2 min-w-[120px] justify-end">
          <button
            onClick={toggleMute}
            className="w-7 h-7 flex items-center justify-center rounded-md bg-zinc-900 border border-white/10 hover:bg-white/5 transition-colors"
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-3.5 h-3.5 text-zinc-500" />
            ) : (
              <Volume2 className="w-3.5 h-3.5 text-zinc-400" />
            )}
          </button>

          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={isMuted ? 0 : volume}
            onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
            className="w-20 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-white"
          />

          <span className="text-xs text-zinc-500 w-7 text-right">
            {Math.round((isMuted ? 0 : volume) * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
}

export default MediaTimeline;
