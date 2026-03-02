import React, { useState, useEffect, useRef } from 'react';
import './PullToRefresh.css';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  threshold?: number;
}

export default function PullToRefresh({ onRefresh, children, threshold = 80 }: PullToRefreshProps) {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const currentY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e: TouchEvent) => {
      requestAnimationFrame(() => {
        if (container.scrollTop === 0) {
          startY.current = e.touches[0].clientY;
          setIsPulling(true);
        }
      });
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling) return;
      
      currentY.current = e.touches[0].clientY;
      const distance = currentY.current - startY.current;
      
      if (distance > 0 && container.scrollTop === 0) {
        e.preventDefault();
        const pullDist = Math.min(distance * 0.5, threshold * 1.5);
        setPullDistance(pullDist);
      }
    };

    const handleTouchEnd = async () => {
      if (pullDistance >= threshold && !isRefreshing) {
        setIsRefreshing(true);
        setPullDistance(threshold);
        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
          setPullDistance(0);
          setIsPulling(false);
        }
      } else {
        setPullDistance(0);
        setIsPulling(false);
      }
    };

    container.addEventListener('touchstart', handleTouchStart);
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isPulling, pullDistance, threshold, isRefreshing, onRefresh]);

  const pullProgress = Math.min(pullDistance / threshold, 1);
  const shouldShowIndicator = pullDistance > 0 || isRefreshing;

  return (
    <div className="pull-to-refresh-container" ref={containerRef}>
      {shouldShowIndicator && (
        <div 
          className="pull-to-refresh-indicator"
          style={{
            transform: `translateY(${Math.min(pullDistance, threshold)}px)`,
            opacity: pullProgress,
          }}
        >
          <div 
            className="pull-to-refresh-spinner"
            style={{
              transform: `rotate(${pullProgress * 360}deg)`,
            }}
          >
            {isRefreshing ? '🔄' : '⬇️'}
          </div>
          <div className="pull-to-refresh-text">
            {isRefreshing ? 'Refreshing...' : pullDistance >= threshold ? 'Release to refresh' : 'Pull to refresh'}
          </div>
        </div>
      )}
      {children}
    </div>
  );
}
