import React, { useState, useEffect } from 'react';
import { storage } from '../utils/storage';
import SafeImage from './SafeImage';
import { Comment } from '../types';
import './Comments.css';

interface CommentsProps {
  postId: string;
  comments: Comment[];
  onAddComment: (text: string) => void;
  onClose: () => void;
}

export default function Comments({ postId, comments, onAddComment, onClose }: CommentsProps) {
  const [newComment, setNewComment] = useState('');
  const [localComments, setLocalComments] = useState<Comment[]>(comments);

  useEffect(() => {
    setLocalComments(comments);
  }, [comments]);

  const handleAddComment = () => {
    if (!newComment.trim()) return;

    const userProfile = storage.getUserProfile();
    const comment: Comment = {
      id: Date.now().toString(),
      authorId: 'me',
      authorName: userProfile?.name || 'You',
      authorPhoto: userProfile?.photos?.[0] || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop',
      text: newComment,
      timestamp: Date.now(),
      likes: [],
    };

    setLocalComments([...localComments, comment]);
    onAddComment(newComment);
    setNewComment('');
  };

  const handleLikeComment = (commentId: string) => {
    setLocalComments(localComments.map(comment => {
      if (comment.id !== commentId) return comment;
      const isLiked = comment.likes.includes('me');
      return {
        ...comment,
        likes: isLiked
          ? comment.likes.filter(id => id !== 'me')
          : [...comment.likes, 'me'],
      };
    }));
  };

  const formatTime = (timestamp: number) => {
    const minutes = Math.floor((Date.now() - timestamp) / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="comments-overlay" onClick={onClose}>
      <div className="comments-modal" onClick={(e) => e.stopPropagation()}>
        <div className="comments-header">
          <h2>Comments</h2>
          <button className="comments-close" onClick={onClose}>✕</button>
        </div>

        <div className="comments-list">
          {localComments.length === 0 ? (
            <div className="comments-empty">
              <div className="empty-icon">💬</div>
              <div>No comments yet. Be the first to comment!</div>
            </div>
          ) : (
            localComments.map((comment) => (
              <div key={comment.id} className="comment-item">
                <SafeImage src={comment.authorPhoto} alt={comment.authorName} className="comment-avatar" />
                <div className="comment-content">
                  <div className="comment-header">
                    <span className="comment-author">{comment.authorName}</span>
                    <span className="comment-time">{formatTime(comment.timestamp)}</span>
                  </div>
                  <div className="comment-text">{comment.text}</div>
                  <div className="comment-actions">
                    <button
                      className={`comment-like-btn ${comment.likes.includes('me') ? 'liked' : ''}`}
                      onClick={() => handleLikeComment(comment.id)}
                    >
                      ❤️ {comment.likes.length}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="comments-input-container">
          <input
            type="text"
            className="comments-input"
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleAddComment();
              }
            }}
          />
          <button
            className="comments-send-btn"
            onClick={handleAddComment}
            disabled={!newComment.trim()}
          >
            Post
          </button>
        </div>
      </div>
    </div>
  );
}
