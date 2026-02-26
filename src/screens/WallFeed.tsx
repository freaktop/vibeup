import React, { useState, useEffect } from 'react';
import Comments from '../components/Comments';
import StoriesViewer from '../components/StoriesViewer';
import PullToRefresh from '../components/PullToRefresh';
import InfiniteScroll from '../components/InfiniteScroll';
import { storage } from '../utils/storage';
import { Comment } from '../types';
import { useToast } from '../hooks/useToast';
import { addWallPostComment, createWallPost, listenWallPosts, toggleWallPostLike } from '../firestore';
import { auth } from '../firebase';
import './WallFeed.css';

interface FeedPost {
  id: string;
  authorName: string;
  authorPhoto: string;
  content: string;
  image?: string;
  video?: string;
  timestamp: number;
  likes: number | string[];
  comments: number | Comment[];
  nsfw?: boolean;
  type?: 'text' | 'image' | 'video' | 'story';
  storyExpiresAt?: number;
  city?: string;
}

export default function WallFeed() {
  const { showToast, ToastContainer } = useToast();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [newPost, setNewPost] = useState('');
  const [showNewPost, setShowNewPost] = useState(false);
  const [nsfwFilter, setNsfwFilter] = useState(true);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [showStories, setShowStories] = useState(false);
  const [selectedStoryIndex, setSelectedStoryIndex] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [displayedPosts, setDisplayedPosts] = useState<FeedPost[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [newPostImage, setNewPostImage] = useState<string>('');
  const [newPostNsfw, setNewPostNsfw] = useState(false);
  const [feedSort, setFeedSort] = useState<'nearby' | 'trending' | 'new'>('new');
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const userProfile = storage.getUserProfile();
  const userNsfwEnabled = userProfile?.nsfwEnabled || false;
  const userCity = userProfile?.currentCity;

  useEffect(() => {
    const unsubscribe = listenWallPosts((livePosts) => {
      const normalized: FeedPost[] = livePosts.map((post) => ({
        id: post.id,
        authorName: post.authorName,
        authorPhoto: post.authorPhoto,
        content: post.content,
        image: post.image,
        video: post.video,
        timestamp: post.timestamp,
        likes: post.likes,
        comments: post.comments,
        nsfw: post.nsfw,
        type: post.type,
        storyExpiresAt: post.storyExpiresAt,
      }));

      setPosts(normalized);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const filtered = getFilteredPosts();
    
    setDisplayedPosts(filtered.slice(0, 10));
    setHasMore(filtered.length > 10);
  }, [posts, nsfwFilter, userNsfwEnabled, feedSort, userCity]);

  const getLikeCount = (post: FeedPost) => (
    Array.isArray(post.likes) ? post.likes.length : (typeof post.likes === 'number' ? post.likes : 0)
  );

  const getFilteredPosts = () => {
    let filtered = posts;

    // Filter by NSFW
    if (!nsfwFilter && !userNsfwEnabled) {
      filtered = filtered.filter(post => !post.nsfw);
    }

    // Filter by city for Nearby
    if (feedSort === 'nearby' && userCity && userCity !== 'Near Me') {
      filtered = filtered.filter(post => !post.city || post.city === userCity);
    }

    if (feedSort === 'trending') {
      return [...filtered].sort((a, b) => getLikeCount(b) - getLikeCount(a));
    }

    return [...filtered].sort((a, b) => b.timestamp - a.timestamp);
  };

  const handleLike = (postId: string) => {
    const uid = auth.currentUser?.uid || 'me';
    setPosts(posts.map(post => {
      if (post.id !== postId) return post;
      const currentLikes = Array.isArray(post.likes) ? post.likes : [];
      const isLiked = currentLikes.includes(uid);

      toggleWallPostLike(postId, uid, isLiked).catch(() => {
        showToast('Unable to update like right now.', 'error');
      });

      return {
        ...post,
        likes: isLiked
          ? currentLikes.filter((id: any) => id !== uid)
          : [...currentLikes, uid],
      };
    }));
  };

  const handleAddComment = (postId: string, text: string) => {
    const uid = auth.currentUser?.uid || 'me';
    const currentUser = storage.getUserProfile();
    const comment: Comment = {
      id: Date.now().toString(),
      authorId: uid,
      authorName: currentUser?.name || 'You',
      authorPhoto: currentUser?.photos?.[0] || '',
      text,
      timestamp: Date.now(),
      likes: [],
    };

    addWallPostComment(postId, comment).catch(() => {
      showToast('Unable to add comment right now.', 'error');
    });
  };

  const handleBookmark = (postId: string) => {
    const bookmarks = storage.getBookmarkedPosts();
    const isBookmarked = bookmarks.includes(postId);
    if (isBookmarked) {
      storage.removeBookmarkedPost(postId);
    } else {
      storage.addBookmarkedPost(postId);
    }
    // Force re-render by updating posts
    setPosts([...posts]);
  };

  const handleViewStory = (post: Post, index: number) => {
    if (post.type === 'story') {
      const storyPosts = posts.filter(p => p.type === 'story');
      const storyIndex = storyPosts.findIndex(p => p.id === post.id);
      setSelectedStoryIndex(storyIndex >= 0 ? storyIndex : 0);
      setShowStories(true);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    showToast('Feed refreshed.', 'success');
    setIsRefreshing(false);
  };

  const handleLoadMore = async () => {
    if (isLoadingMore) return;
    setIsLoadingMore(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    const filtered = getFilteredPosts();
    const nextBatch = filtered.slice(displayedPosts.length, displayedPosts.length + 10);
    if (nextBatch.length > 0) {
      setDisplayedPosts([...displayedPosts, ...nextBatch]);
    } else {
      setHasMore(false);
    }
    setIsLoadingMore(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewPostImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePost = () => {
    if (!newPost.trim() && !newPostImage) return;

    createWallPost({
      content: newPost.trim(),
      image: newPostImage || undefined,
      nsfw: newPostNsfw,
      tags: [],
      type: newPostImage ? 'image' : 'text',
    }).catch(() => {
      showToast('Failed to create post. Try again.', 'error');
    });

    setNewPost('');
    setNewPostImage('');
    setNewPostNsfw(false);
    setShowNewPost(false);
    showToast('Post published.', 'success');
  };

  const formatTime = (timestamp: number) => {
    const minutes = Math.floor((Date.now() - timestamp) / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };


  const filteredPosts = displayedPosts.length > 0 ? displayedPosts : getFilteredPosts();

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="wallfeed-container">
      <ToastContainer />
      <div className="wallfeed-header">
        <button 
          className="new-post-button"
          onClick={() => setShowNewPost(!showNewPost)}
        >
          ✏️ New Post
        </button>
        <div className="wallfeed-filters">
          <button
            className={`wallfeed-filter ${feedSort === 'nearby' ? 'active' : ''}`}
            onClick={() => setFeedSort('nearby')}
          >
            📍 Nearby
          </button>
          <button
            className={`wallfeed-filter ${feedSort === 'trending' ? 'active' : ''}`}
            onClick={() => setFeedSort('trending')}
          >
            🔥 Trending
          </button>
          <button
            className={`wallfeed-filter ${feedSort === 'new' ? 'active' : ''}`}
            onClick={() => setFeedSort('new')}
          >
            🆕 New
          </button>
          {userNsfwEnabled && (
            <button
              className={`nsfw-toggle ${nsfwFilter ? 'active' : ''}`}
              onClick={() => setNsfwFilter(!nsfwFilter)}
            >
              {nsfwFilter ? '🔞 NSFW ON' : '🔞 NSFW OFF'}
            </button>
          )}
        </div>
      </div>

      {showNewPost && (
        <div className="new-post-form">
          <textarea
            className="new-post-input"
            placeholder="What's on your mind?"
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            rows={4}
          />
          {newPostImage && (
            <div className="new-post-image-preview">
              <img src={newPostImage} alt="Preview" />
              <button className="remove-image-btn" onClick={() => setNewPostImage('')}>✕</button>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            style={{ display: 'none' }}
          />
          <div className="new-post-options">
            <button className="add-image-btn" onClick={() => fileInputRef.current?.click()}>
              📷 Add Image
            </button>
            {userNsfwEnabled && (
              <label className="nsfw-checkbox">
                <input
                  type="checkbox"
                  checked={newPostNsfw}
                  onChange={(e) => setNewPostNsfw(e.target.checked)}
                />
                <span>🔞 NSFW</span>
              </label>
            )}
          </div>
          <div className="new-post-actions">
            <button className="cancel-button" onClick={() => { setShowNewPost(false); setNewPost(''); setNewPostImage(''); }}>
              Cancel
            </button>
            <button className="post-button" onClick={handlePost}>
              Post
            </button>
          </div>
        </div>
      )}

      <div className="wallfeed-posts">
        {filteredPosts.map((post) => (
          <div key={post.id} className="wallfeed-post">
            <div className="post-header">
              <img src={post.authorPhoto} alt={post.authorName} className="post-author-photo" />
              <div className="post-author-info">
                <div className="post-author-name">{post.authorName}</div>
                <div className="post-timestamp">{formatTime(post.timestamp)}</div>
              </div>
            </div>
            <div className="post-content">
              {post.content}
              {post.nsfw && <span className="nsfw-badge">🔞 NSFW</span>}
            </div>
            {post.image && (
              <img 
                src={post.image} 
                alt="Post" 
                className={`post-image ${post.nsfw && !nsfwFilter ? 'blurred' : ''}`}
              />
            )}
            {post.video && (
              <video 
                src={post.video} 
                controls 
                className={`post-video ${post.nsfw && !nsfwFilter ? 'blurred' : ''}`}
              />
            )}
            {post.type === 'story' && (
              <div 
                className="story-post"
                onClick={() => handleViewStory(post, 0)}
              >
                <div className="story-indicator">📸 Story</div>
                <div className="story-content">Tap to view story (expires in 24h)</div>
              </div>
            )}
            <div className="post-actions">
              <button 
                className={`post-action-btn ${Array.isArray(post.likes) && post.likes.includes('me') ? 'liked' : ''}`}
                onClick={() => handleLike(post.id)}
              >
                ❤️ {Array.isArray(post.likes) ? post.likes.length : (typeof post.likes === 'number' ? post.likes : 0)}
              </button>
              <button 
                className="post-action-btn" 
                onClick={() => setSelectedPostId(post.id)}
              >
                💬 {post.comments?.length || (typeof post.comments === 'number' ? post.comments : 0)}
              </button>
              <button 
                className={`post-action-btn ${storage.getBookmarkedPosts().includes(post.id) ? 'bookmarked' : ''}`}
                onClick={() => handleBookmark(post.id)}
              >
                🔖 {storage.getBookmarkedPosts().includes(post.id) ? 'Saved' : 'Save'}
              </button>
              <button className="post-action-btn" onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: `${post.authorName}'s post`,
                    text: post.content,
                    url: window.location.href,
                  }).catch(() => {});
                } else {
                  navigator.clipboard
                    .writeText(window.location.href)
                    .then(() => showToast('Link copied to clipboard!', 'success'))
                    .catch(() => showToast('Unable to copy link.', 'error'));
                }
              }}>
                🔗 Share
              </button>
            </div>
          </div>
        ))}
        <InfiniteScroll
          onLoadMore={handleLoadMore}
          hasMore={hasMore}
          isLoading={isLoadingMore}
        >
          <div></div>
        </InfiniteScroll>
      </div>

      {selectedPostId && (
        <Comments
          postId={selectedPostId}
          comments={posts.find(p => p.id === selectedPostId)?.comments || []}
          onAddComment={(text) => {
            handleAddComment(selectedPostId, text);
          }}
          onClose={() => setSelectedPostId(null)}
        />
      )}

      {showStories && (
        <StoriesViewer
          stories={posts.filter(p => p.type === 'story')}
          initialIndex={selectedStoryIndex}
          onClose={() => setShowStories(false)}
        />
      )}
      </div>
    </PullToRefresh>
  );
}
