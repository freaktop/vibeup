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
  const pullDistanceRef = useRef(0);
  const isRefreshingRef = useRef(false);
  const isPullingRef = useRef(false);
  pullDistanceRef.current = pullDistance;
  isRefreshingRef.current = isRefreshing;
  isPullingRef.current = isPulling;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (container.scrollTop === 0) {
        startY.current = e.touches[0].clientY;
        isPullingRef.current = true;
        setIsPulling(true);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPullingRef.current) return;
      currentY.current = e.touches[0].clientY;
      const distance = currentY.current - startY.current;
      if (distance > 0 && container.scrollTop === 0) {
        e.preventDefault();
        const pullDist = Math.min(distance * 0.5, threshold * 1.5);
        pullDistanceRef.current = pullDist;
        setPullDistance(pullDist);
      }
    };

    const handleTouchEnd = async () => {
      const dist = pullDistanceRef.current;
      const refreshing = isRefreshingRef.current;
      if (dist >= threshold && !refreshing) {
        isRefreshingRef.current = true;
        setIsRefreshing(true);
        setPullDistance(threshold);
        try {
          await onRefresh();
        } finally {
          isRefreshingRef.current = false;
          pullDistanceRef.current = 0;
          isPullingRef.current = false;
          setIsRefreshing(false);
          setPullDistance(0);
          setIsPulling(false);
        }
      } else {
        pullDistanceRef.current = 0;
        isPullingRef.current = false;
        setPullDistance(0);
        setIsPulling(false);
      }
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [threshold, onRefresh]);

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
