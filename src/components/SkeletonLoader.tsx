import './SkeletonLoader.css';

interface SkeletonLoaderProps {
  type?: 'card' | 'list' | 'profile' | 'post';
  count?: number;
}

export default function SkeletonLoader({ type = 'card', count = 1 }: SkeletonLoaderProps) {
  const items = Array.from({ length: count });

  if (type === 'card') {
    return (
      <>
        {items.map((_, i) => (
          <div key={i} className="skeleton-card">
            <div className="skeleton-image"></div>
            <div className="skeleton-content">
              <div className="skeleton-line skeleton-title"></div>
              <div className="skeleton-line skeleton-text"></div>
              <div className="skeleton-line skeleton-text short"></div>
            </div>
          </div>
        ))}
      </>
    );
  }

  if (type === 'list') {
    return (
      <>
        {items.map((_, i) => (
          <div key={i} className="skeleton-list-item">
            <div className="skeleton-avatar"></div>
            <div className="skeleton-content">
              <div className="skeleton-line"></div>
              <div className="skeleton-line short"></div>
            </div>
          </div>
        ))}
      </>
    );
  }

  if (type === 'profile') {
    return (
      <div className="skeleton-profile">
        <div className="skeleton-profile-header">
          <div className="skeleton-avatar large"></div>
          <div className="skeleton-content">
            <div className="skeleton-line skeleton-title"></div>
            <div className="skeleton-line short"></div>
          </div>
        </div>
        <div className="skeleton-profile-body">
          <div className="skeleton-line"></div>
          <div className="skeleton-line"></div>
          <div className="skeleton-line short"></div>
        </div>
      </div>
    );
  }

  if (type === 'post') {
    return (
      <>
        {items.map((_, i) => (
          <div key={i} className="skeleton-post">
            <div className="skeleton-post-header">
              <div className="skeleton-avatar"></div>
              <div className="skeleton-content">
                <div className="skeleton-line short"></div>
              </div>
            </div>
            <div className="skeleton-image"></div>
            <div className="skeleton-content">
              <div className="skeleton-line"></div>
              <div className="skeleton-line"></div>
              <div className="skeleton-line short"></div>
            </div>
          </div>
        ))}
      </>
    );
  }

  return null;
}
