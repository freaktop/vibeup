import React, { useState, useEffect } from 'react';
import { Post } from '../types';
import { useToast } from '../hooks/useToast';
import './StoriesViewer.css';

interface StoriesViewerProps {
  stories: Post[];
  initialIndex: number;
  onClose: () => void;
}

export default function StoriesViewer({ stories, initialIndex, onClose }: StoriesViewerProps) {
  const { showToast, ToastContainer } = useToast();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const currentStory = stories[currentIndex];

  useEffect(() => {
    if (!currentStory) {
      onClose();
      return;
    }

    const duration = 5000; // 5 seconds per story
    const interval = 100; // Update every 100ms
    const increment = (interval / duration) * 100;

    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          handleNext();
          return 0;
        }
        return prev + increment;
      });
    }, interval);

    return () => clearInterval(progressInterval);
  }, [currentIndex, currentStory]);

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setProgress(0);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const clickPosition = x / rect.width;

    if (clickPosition < 0.33) {
      handlePrev();
    } else if (clickPosition > 0.66) {
      handleNext();
    }
  };

  if (!currentStory) return null;

  return (
    <div className="stories-viewer-overlay" onClick={onClose}>
      <div className="stories-viewer" onClick={(e) => e.stopPropagation()}>
        <ToastContainer />
        <div className="stories-progress-bar">
          {stories.map((_, index) => (
            <div key={index} className="stories-progress-segment">
              <div
                className={`stories-progress-fill ${
                  index === currentIndex ? 'active' : index < currentIndex ? 'completed' : ''
                }`}
                style={{
                  width: index === currentIndex ? `${progress}%` : index < currentIndex ? '100%' : '0%',
                }}
              />
            </div>
          ))}
        </div>

        <div className="stories-header">
          <div className="stories-author">
            <img src={currentStory.authorPhoto} alt={currentStory.authorName} className="stories-author-avatar" />
            <span className="stories-author-name">{currentStory.authorName}</span>
            <span className="stories-time">{formatTime(currentStory.timestamp)}</span>
          </div>
          <button className="stories-close" onClick={onClose}>✕</button>
        </div>

        <div className="stories-content" onClick={handleClick}>
          {currentStory.image && (
            <img src={currentStory.image} alt="Story" className="stories-image" />
          )}
          {currentStory.video && (
            <video src={currentStory.video} className="stories-video" autoPlay loop />
          )}
          {currentStory.content && (
            <div className="stories-text-overlay">
              <p>{currentStory.content}</p>
            </div>
          )}
        </div>

        <div className="stories-actions">
          <button className="stories-action-btn" onClick={() => showToast('Story liked.', 'success')}>
            ❤️
          </button>
          <button className="stories-action-btn" onClick={() => showToast('Comments on stories are coming soon.', 'info')}>
            💬
          </button>
          <button className="stories-action-btn" onClick={() => showToast('Share action is coming soon.', 'info')}>
            🔗
          </button>
        </div>
      </div>
    </div>
  );
}

function formatTime(timestamp: number) {
  const hours = Math.floor((Date.now() - timestamp) / 3600000);
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  return 'Yesterday';
}
