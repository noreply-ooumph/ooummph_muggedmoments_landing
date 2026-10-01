"use client";

import { useEffect, useRef } from "react";

export function BackgroundVideo() {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.defaultMuted = true;
      videoRef.current.muted = true;
      videoRef.current.play().catch((err) => {
        // Silently handle autoplay rejection if browser restricts playback
        console.warn("Background video autoplay blocked:", err);
      });
    }
  }, []);

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        className="w-full h-full object-cover opacity-60"
      >
        <source src="/bg-video.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/60 via-zinc-950/40 to-zinc-950/75" />
    </div>
  );
}
