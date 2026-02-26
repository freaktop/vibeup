import React, { useState, useEffect } from 'react';
import { Notification } from '../types';
import { auth } from '../firebase';
import { listenNotifications, markAllNotificationsRead, markNotificationRead } from '../firestore';
import './Notifications.css';

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setNotifications([]);
      return;
    }

    const unsubscribe = listenNotifications(uid, (rows) => {
      setNotifications(rows);
    });

    return () => unsubscribe();
  }, []);

  const markAsRead = (id: string) => {
    const uid = auth.currentUser?.uid;
    if (uid) {
      markNotificationRead(uid, id).catch(() => null);
    }
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
  };

  const markAllAsRead = () => {
    const uid = auth.currentUser?.uid;
    if (uid) {
      markAllNotificationsRead(uid).catch(() => null);
    }
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const filteredNotifications = filter === 'unread'
    ? notifications.filter(n => !n.read)
    : notifications;

  const unreadCount = notifications.filter(n => !n.read).length;

  const getNotificationIcon = (type: string) => {
    const icons: { [key: string]: string } = {
      message: '💬',
      match: '💚',
      like: '❤️',
      event: '📅',
      rsvp: '✅',
      comment: '💭',
      mention: '@',
    };
    return icons[type] || '🔔';
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
    <div className="notifications-container">
      <div className="notifications-header">
        <h2>Notifications</h2>
        {unreadCount > 0 && (
          <button className="mark-all-read-btn" onClick={markAllAsRead}>
            Mark all read
          </button>
        )}
      </div>

      <div className="notifications-filters">
        <button
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All {notifications.length > 0 && `(${notifications.length})`}
        </button>
        <button
          className={`filter-btn ${filter === 'unread' ? 'active' : ''}`}
          onClick={() => setFilter('unread')}
        >
          Unread {unreadCount > 0 && `(${unreadCount})`}
        </button>
      </div>

      <div className="notifications-list">
        {filteredNotifications.length === 0 ? (
          <div className="notifications-empty">
            <div className="empty-icon">🔔</div>
            <div className="empty-text">No notifications</div>
          </div>
        ) : (
          filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`notification-item ${!notification.read ? 'unread' : ''}`}
              onClick={() => {
                if (!notification.read) {
                  markAsRead(notification.id);
                }
                // Handle different notification types
                if (notification.type === 'message' && notification.actionUrl) {
                  // Open chat
                  const profileId = notification.actionUrl.split('/').pop();
                  if (profileId) {
                    window.dispatchEvent(new CustomEvent('openChat', { detail: { profileId } }));
                    window.dispatchEvent(new CustomEvent('switchTab', { detail: { tab: 'messages' } }));
                  }
                } else if (notification.type === 'match' && notification.actionUrl) {
                  // Open messages tab
                  window.dispatchEvent(new CustomEvent('switchTab', { detail: { tab: 'messages' } }));
                } else if (notification.type === 'event' && notification.actionUrl) {
                  // Open events tab
                  window.dispatchEvent(new CustomEvent('switchTab', { detail: { tab: 'events' } }));
                } else if (notification.actionUrl) {
                  // Generic navigation
                  const url = notification.actionUrl;
                  if (url.startsWith('/')) {
                    // Could implement router navigation here
                    console.log('Navigate to:', url);
                  }
                }
              }}
            >
              <div className="notification-icon">
                {getNotificationIcon(notification.type)}
              </div>
              <div className="notification-content">
                <div className="notification-title">{notification.title}</div>
                <div className="notification-body">{notification.body}</div>
                <div className="notification-time">{formatTime(notification.timestamp)}</div>
              </div>
              {!notification.read && <div className="notification-dot"></div>}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
