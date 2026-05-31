import React, { useState, useEffect } from 'react';

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=600&fit=crop';

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string | undefined;
  fallback?: string;
}

/** Image with onError fallback and optional lazy loading */
export default function SafeImage({ src, fallback = DEFAULT_AVATAR, loading, ...props }: SafeImageProps) {
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
    />
  );
}
