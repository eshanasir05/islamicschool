'use client';

export default function AudioPlayer({ src }: { src: string }) {
  return (
    <audio
      controls
      src={src}
      style={{ width: '100%', height: 36, marginTop: 8 }}
    />
  );
}
