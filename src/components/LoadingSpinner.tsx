import React from 'react';
import './LoadingSpinner.css';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
}

export default function LoadingSpinner({ size = 'medium', color = '#FF6B9D' }: LoadingSpinnerProps) {
  return (
    <div className={`loading-spinner loading-spinner-${size}`} style={{ borderTopColor: color }}>
      <div></div>
    </div>
  );
}
