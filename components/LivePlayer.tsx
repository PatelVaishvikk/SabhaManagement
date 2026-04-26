"use client";

import { ExternalLink } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { VideoPlayerController } from "@/hooks/useVideoPlayer";
import { getDrivePreviewUrl, getDriveProxyStreamUrl } from "@/lib/utils/googleDrive";
import type { VideoDoc } from "@/types";

declare global {
  interface Window {
    YT?: {
      Player: new (
        element: HTMLElement,
        options: {
          videoId: string;
          playerVars?: Record<string, unknown>;
          events?: {
            onReady?: () => void;
            onStateChange?: (event: { data: number }) => void;
          };
        }
      ) => YouTubePlayer;
      PlayerState: { ENDED: number };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface YouTubePlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  stopVideo: () => void;
  mute: () => void;
  unMute: () => void;
  setVolume: (volume: number) => void;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  destroy: () => void;
}

interface LivePlayerProps {
  video?: VideoDoc;
  onReady: (controller: VideoPlayerController) => void;
  onEnded?: () => void;
  onPlayingChange?: (playing: boolean) => void;
}

export function LivePlayer({ video, onReady, onEnded, onPlayingChange }: LivePlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const youtubeContainerRef = useRef<HTMLDivElement | null>(null);
  const youtubePlayerRef = useRef<YouTubePlayer | null>(null);
  const onReadyRef = useRef(onReady);
  const onEndedRef = useRef(onEnded);
  const onPlayingChangeRef = useRef(onPlayingChange);
  const [playbackError, setPlaybackError] = useState("");
  const id = useId().replace(/:/g, "");

  useEffect(() => {
    onReadyRef.current = onReady;
    onEndedRef.current = onEnded;
    onPlayingChangeRef.current = onPlayingChange;
  }, [onEnded, onPlayingChange, onReady]);

  useEffect(() => {
    setPlaybackError("");
  }, [video?._id]);

  useEffect(() => {
    if (!video || video.sourceType === "youtube") return;
    const element = videoRef.current;
    if (!element) return;

    onReady({
      play: () => {
        void element.play().catch(() => {
          setPlaybackError(
            video.sourceType === "gdrive"
              ? "Google Drive did not provide a browser-playable MP4 stream. Use the Drive preview fallback or upload this file to Cloudinary for controlled live playback."
              : "This video source could not be played by the browser."
          );
        });
      },
      pause: () => element.pause(),
      stop: () => {
        element.pause();
        element.currentTime = 0;
      },
      seekTo: (seconds) => {
        if (Number.isFinite(seconds)) {
          element.currentTime = Math.max(0, seconds);
        }
      },
      mute: () => {
        element.muted = true;
      },
      unmute: () => {
        element.muted = false;
      },
      setVolume: (volume) => {
        element.volume = Math.max(0, Math.min(1, volume));
      },
      getCurrentTime: () => element.currentTime,
      getDuration: () => element.duration || video.duration || 0
    });
  }, [onReady, video]);

  useEffect(() => {
    if (!video || video.sourceType !== "youtube" || !video.youtubeId) return;

    let cancelled = false;
    const currentVideo = video;

    function createPlayer() {
      if (cancelled || !window.YT || !youtubeContainerRef.current || !currentVideo.youtubeId) return;
      youtubePlayerRef.current?.destroy();
      youtubePlayerRef.current = new window.YT.Player(youtubeContainerRef.current, {
        videoId: currentVideo.youtubeId,
        playerVars: {
          controls: 0,
          disablekb: 1,
          enablejsapi: 1,
          fs: 0,
          iv_load_policy: 3,
          modestbranding: 1,
          playsinline: 1,
          rel: 0
        },
        events: {
          onReady: () => {
            const player = youtubePlayerRef.current;
            if (!player) return;
            onReadyRef.current({
              play: () => player.playVideo(),
              pause: () => player.pauseVideo(),
              stop: () => player.stopVideo(),
              seekTo: (seconds) => player.seekTo(Math.max(0, seconds), true),
              mute: () => player.mute(),
              unmute: () => player.unMute(),
              setVolume: (volume) => player.setVolume(Math.round(Math.max(0, Math.min(1, volume)) * 100)),
              getCurrentTime: () => player.getCurrentTime(),
              getDuration: () => player.getDuration() || currentVideo.duration || 0
            });
          },
          onStateChange: (event) => {
            if (event.data === 1) onPlayingChangeRef.current?.(true);
            if (event.data === 2 || event.data === 0) onPlayingChangeRef.current?.(false);
            if (event.data === window.YT?.PlayerState.ENDED) onEndedRef.current?.();
          }
        }
      });
    }

    if (window.YT?.Player) {
      createPlayer();
    } else {
      const existing = document.querySelector<HTMLScriptElement>("script[src='https://www.youtube.com/iframe_api']");
      if (!existing) {
        const script = document.createElement("script");
        script.src = "https://www.youtube.com/iframe_api";
        document.body.appendChild(script);
      }
      const previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        previous?.();
        createPlayer();
      };
    }

    return () => {
      cancelled = true;
      youtubePlayerRef.current?.destroy();
      youtubePlayerRef.current = null;
    };
  }, [video]);

  if (!video) {
    return <div className="flex aspect-video w-full items-center justify-center bg-black text-sm text-white/70">No video selected</div>;
  }

  if (video.sourceType === "youtube") {
    return (
      <div className="aspect-video w-full overflow-hidden bg-black">
        <div id={`youtube-${id}`} ref={youtubeContainerRef} className="h-full w-full" />
      </div>
    );
  }

  const drivePreviewUrl = video.sourceType === "gdrive" && video.driveFileId ? getDrivePreviewUrl(video.driveFileId) : "";
  const streamUrl = video.sourceType === "gdrive" && video.driveFileId ? getDriveProxyStreamUrl(video.driveFileId) : video.streamUrl;

  return (
    <div className="relative aspect-video w-full bg-black">
      <video
        key={video._id}
        ref={videoRef}
        className="h-full w-full bg-black"
        src={streamUrl}
        poster={video.thumbnailUrl}
        onEnded={onEnded}
        onPlay={() => onPlayingChange?.(true)}
        onPause={() => onPlayingChange?.(false)}
        onError={() =>
          setPlaybackError(
            video.sourceType === "gdrive"
              ? "Google Drive did not provide a browser-playable MP4 stream. Use the Drive preview fallback or upload this file to Cloudinary for controlled live playback."
              : "This video source could not be played by the browser."
          )
        }
        onLoadedMetadata={() => setPlaybackError("")}
        playsInline
      />
      {playbackError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-6 text-center text-white">
          <div className="max-w-lg space-y-4">
            <p className="text-sm">{playbackError}</p>
            {drivePreviewUrl && (
              <Button asChild variant="secondary">
                <a href={drivePreviewUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  Open Drive preview
                </a>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
