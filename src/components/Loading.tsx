import './Loading.css';

interface LoadingProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
  fullScreen?: boolean;
}

export default function Loading({ message, size = 'medium', fullScreen = false }: LoadingProps) {
  const sizeClass = `loading-spinner-${size}`;
  
  if (fullScreen) {
    return (
      <div className="loading-fullscreen">
        <div className={`loading-spinner ${sizeClass}`}></div>
        {message && <div className="loading-message">{message}</div>}
      </div>
    );
  }
  
  return (
    <div className="loading-container">
      <div className={`loading-spinner ${sizeClass}`}></div>
      {message && <div className="loading-message">{message}</div>}
    </div>
  );
}
