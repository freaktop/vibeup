import React, { useState, useEffect } from 'react';

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=600&fit=crop';

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string | undefined;
  fallback?: string;
  blurred?: boolean;
}

/** Image with onError fallback, optional lazy loading, and blur support */
export default function SafeImage({ src, fallback = DEFAULT_AVATAR, loading, blurred, style, ...props }: SafeImageProps) {
  const [imgSrc, setImgSrc] = useState(src || fallback);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    setImgSrc(src || fallback);
    setErrored(false);
  }, [src, fallback]);

  const handleError = () => {
    if (!errored) {
      setErrored(true);
      setImgSrc(fallback);
    }
  };

  return (
    <img
      {...props}
      src={imgSrc}
      loading={loading ?? 'lazy'}
      onError={handleError}
      style={{
        ...(blurred ? { filter: 'blur(20px)', pointerEvents: 'none' } : {}),
        ...style,
      }}
    />
  );
}
