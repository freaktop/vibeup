import './ErrorMessage.css';

interface ErrorMessageProps {
  message: string;
  onDismiss?: () => void;
  type?: 'error' | 'warning' | 'info';
  retry?: () => void;
}

export default function ErrorMessage({ 
  message, 
  onDismiss, 
  type = 'error',
  retry 
}: ErrorMessageProps) {
  const icons = {
    error: '⚠️',
    warning: '⚠️',
    info: 'ℹ️',
  };

  return (
    <div className={`error-message error-message-${type}`}>
      <div className="error-message-content">
        <span className="error-message-icon">{icons[type]}</span>
        <span className="error-message-text">{message}</span>
        {retry && (
          <button className="error-message-retry" onClick={retry}>
            Retry
          </button>
        )}
        {onDismiss && (
          <button className="error-message-dismiss" onClick={onDismiss}>
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
