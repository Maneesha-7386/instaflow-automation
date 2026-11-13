import React from 'react';

export default function PhonePreview({
  caption = 'Your caption appears here',
  accountHandle = '@lumen.studio',
  accountAvatarColor = '#6d3df2',
  accountInitials = 'LS',
  videoUrl = '',
  coverUrl = '',
  gradientHue = 280,
  audioName = 'Original audio · InstaFlow AI',
}) {
  const bgStyle =
    videoUrl || coverUrl
      ? {}
      : {
          background: `linear-gradient(160deg, hsl(${gradientHue} 75% 50%), hsl(${
            (gradientHue + 50) % 360
          } 80% 32%))`,
        };

  return (
    <div className="relative w-full max-w-[240px] aspect-[9/16] rounded-[28px] border-[6px] border-[var(--tx)] overflow-hidden shadow-2xl flex flex-col justify-between p-3.5 text-white select-none mx-auto bg-black">
      {/* Video or cover image if present */}
      {videoUrl ? (
        <video
          src={videoUrl}
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : coverUrl ? (
        <img src={coverUrl} alt="Cover preview" className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 w-full h-full" style={bgStyle} />
      )}

      {/* Dimming gradient overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/75 pointer-events-none" />

      {/* Top Header Overlay */}
      <div className="relative z-10 flex items-center justify-between text-xs font-semibold px-0.5 pt-1">
        <span className="tracking-wide">Reels</span>
        <span className="opacity-80">📷</span>
      </div>

      {/* Right Action Icons Rail */}
      <div className="absolute right-2.5 bottom-16 z-10 flex flex-col items-center gap-3 text-white">
        <div className="flex flex-col items-center">
          <span className="text-lg">🤍</span>
          <span className="text-[10px] font-medium">1.2K</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-lg">💬</span>
          <span className="text-[10px] font-medium">84</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-lg">↗️</span>
          <span className="text-[10px] font-medium">Share</span>
        </div>
        <div className="w-6 h-6 rounded-full border border-white/40 flex items-center justify-center animate-spin-slow">
          <span className="text-[8px]">🎵</span>
        </div>
      </div>

      {/* Bottom Content Info */}
      <div className="relative z-10 flex flex-col gap-1 pr-10 pb-1">
        {/* Account Info */}
        <div className="flex items-center gap-2">
          <span
            className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow"
            style={{ background: accountAvatarColor }}
          >
            {accountInitials}
          </span>
          <span className="font-bold text-xs truncate drop-shadow-sm">
            {accountHandle}
          </span>
        </div>

        {/* Caption */}
        <p className="text-[11px] leading-tight line-clamp-3 text-white/95 font-medium m-0 drop-shadow-sm">
          {caption || 'Your caption appears here'}
        </p>

        {/* Audio Track */}
        <div className="flex items-center gap-1.5 text-[10px] text-white/80 font-normal truncate mt-0.5">
          <span>♫</span>
          <span className="truncate">{audioName}</span>
        </div>
      </div>
    </div>
  );
}

