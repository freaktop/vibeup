import React, { useEffect, useRef, useState } from 'react';

interface InfiniteScrollProps {
  onLoadMore: () => Promise<void>;
  hasMore: boolean;
  isLoading: boolean;
  children: React.ReactNode;
  threshold?: number;
}

export default function InfiniteScroll({
  onLoadMore,
  hasMore,
  isLoading,
  children,
  threshold = 200,
}: InfiniteScrollProps) {
  const observerRef = useRef<HTMLDivElement>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setIsIntersecting(entry.isIntersecting);
      },
      {
        root: null,
        rootMargin: `${threshold}px`,
        threshold: 0.1,
      }
    );

    const currentRef = observerRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [threshold]);

  useEffect(() => {
    if (isIntersecting && hasMore && !isLoading) {
      onLoadMore();
    }
  }, [isIntersecting, hasMore, isLoading, onLoadMore]);

  return (
    <>
      {children}
      {hasMore && (
        <div ref={observerRef} className="infinite-scroll-trigger">
          {isLoading && (
            <div className="infinite-scroll-loading">
              <div className="loading-spinner"></div>
              <span>Loading more...</span>
            </div>
          )}
        </div>
      )}
      {!hasMore && (
        <div className="infinite-scroll-end">
          <span>No more items</span>
        </div>
      )}
    </>
  );
}
