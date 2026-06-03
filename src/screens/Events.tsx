import { useState, useEffect } from 'react';
import { storage } from '../utils/storage';
import { Event, Location } from '../types';
import { getCurrentUid } from '../auth';
import { addCheckIn, createEvent, createLocation, listenCheckInsAtEvent, listenCheckInsAtLocation, listenEvents, listenLocations, setEventRsvp, type CheckIn } from '../firestore';
import SafeImage from '../components/SafeImage';
import ListVenueModal from '../components/ListVenueModal';
import { usCities } from '../data/cities';
import { getCurrentLocation } from '../utils/geolocation';
import { useToast } from '../hooks/useToast';
import './Events.css';

type ViewMode = 'events' | 'places' | 'all';
type PlaceFilter = 'all' | 'hotel' | 'bar' | 'party' | 'restaurant' | 'event' | 'venue';
type EventFilter = 'all' | 'going' | 'interested' | 'public' | 'private';
type DateFilter = 'all' | 'today' | 'weekend' | 'week' | 'month';
type EventViewMode = 'list' | 'calendar';

export default function Events() {
  const { showToast, ToastContainer } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [places, setPlaces] = useState<Location[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [placeFilter, setPlaceFilter] = useState<PlaceFilter>('all');
  const [eventFilter, setEventFilter] = useState<EventFilter>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [cityFilter, setCityFilter] = useState('all');
  const [vibeFilter, setVibeFilter] = useState('all');
  const [hostFilter, setHostFilter] = useState('all');
  const [eventViewMode, setEventViewMode] = useState<EventViewMode>('list');
  const [showCreate, setShowCreate] = useState(false);
  const [showListVenue, setShowListVenue] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{ type: 'event' | 'place'; data: Event | Location } | null>(null);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const userId = getCurrentUid() ?? 'me';

  useEffect(() => {
    const unsubEvents = listenEvents((rows) => setEvents(rows));
    const unsubLocations = listenLocations((rows) => setPlaces(rows));

    return () => {
      unsubEvents();
      unsubLocations();
    };
  }, []);

  useEffect(() => {
    if (!selectedItem || !userId) return;
    let unsub: (() => void) | undefined;
    if (selectedItem.type === 'event') {
      unsub = listenCheckInsAtEvent((selectedItem.data as Event).id, (rows) => {
        setCheckIns(rows);
        setHasCheckedIn(rows.some((c) => c.userId === userId));
      });
    } else {
      unsub = listenCheckInsAtLocation((selectedItem.data as Location).id, (rows) => {
        setCheckIns(rows);
        setHasCheckedIn(rows.some((c) => c.userId === userId));
      });
    }
    return () => unsub?.();
  }, [selectedItem, userId]);

  const getRSVPStatus = (event: Event): 'going' | 'interested' | 'notGoing' | null => {
    if (event.rsvps.going.includes(userId)) return 'going';
    if (event.rsvps.interested.includes(userId)) return 'interested';
    if (event.rsvps.notGoing.includes(userId)) return 'notGoing';
    return null;
  };

  const handleCheckIn = async () => {
    if (!userId || !selectedItem) return;
    try {
      const loc = await getCurrentLocation();
      if (selectedItem.type === 'event') {
        const event = selectedItem.data as Event;
        await addCheckIn(userId, {
          eventId: event.id,
          placeName: event.title,
          lat: loc?.latitude,
          lng: loc?.longitude,
        });
        showToast('Checked in!', 'success');
      } else {
        const place = selectedItem.data as Location;
        await addCheckIn(userId, {
          locationId: place.id,
          placeName: place.name,
          lat: loc?.latitude,
          lng: loc?.longitude,
        });
        showToast('Checked in!', 'success');
      }
    } catch {
      showToast('Could not check in. Try again.', 'error');
    }
  };

  const handleRSVP = (eventId: string, status: 'going' | 'interested' | 'notGoing') => {
    try {
      const event = events.find(e => e.id === eventId);
      if (!event) return;

      // Enforce maxAttendees for 'going' RSVP
      if (status === 'going' && event.maxAttendees && event.rsvps.going.length >= event.maxAttendees) {
        showToast('This event is full. Join the waitlist or mark as interested.', 'info');
        return;
      }

      setEvents(events.map(e => {
        if (e.id !== eventId) return e;
        
        const newRSVPs = { ...e.rsvps };
        // Remove from all lists
        newRSVPs.going = newRSVPs.going.filter(id => id !== userId);
        newRSVPs.interested = newRSVPs.interested.filter(id => id !== userId);
        newRSVPs.notGoing = newRSVPs.notGoing.filter(id => id !== userId);
        
        // Add to selected list (unless notGoing, then just remove)
        if (status !== 'notGoing') {
          newRSVPs[status].push(userId);
        }
        
        return { ...e, rsvps: newRSVPs };
      }));

      setEventRsvp(eventId, userId, status).catch(() => {
        showToast('Unable to update RSVP right now.', 'error');
      });
    } catch (error) {
      console.error('Error handling RSVP:', error);
    }
  };

  const filteredEvents = events.filter(event => {
    if (eventFilter === 'going') return event.rsvps.going.includes(userId);
    if (eventFilter === 'interested') return event.rsvps.interested.includes(userId);
    if (eventFilter === 'public') return event.isPublic;
    if (eventFilter === 'private') return !event.isPublic;
    return true;
  }).filter(event => {
    if (cityFilter !== 'all') {
      const eventCity = event.city || 'Near Me';
      if (eventCity !== cityFilter) return false;
    }
    if (vibeFilter !== 'all') {
      const hasVibe = event.tags?.some(tag => tag.toLowerCase() === vibeFilter.toLowerCase());
      if (!hasVibe) return false;
    }
    if (hostFilter !== 'all' && event.organizerName !== hostFilter) return false;
    if (dateFilter === 'all') return true;

    const eventDate = new Date(event.date);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (dateFilter === 'today') {
      return eventDate >= today && eventDate < new Date(today.getTime() + 86400000);
    }
    if (dateFilter === 'weekend') {
      const day = eventDate.getDay();
      return day === 0 || day === 6;
    }
    if (dateFilter === 'week') {
      const weekFromNow = new Date(today.getTime() + 86400000 * 7);
      return eventDate >= today && eventDate <= weekFromNow;
    }
    if (dateFilter === 'month') {
      return eventDate.getMonth() === now.getMonth() && eventDate.getFullYear() === now.getFullYear();
    }
    return true;
  });

  const eventCities = Array.from(new Set(events.map(event => event.city || 'Near Me'))).sort();
  const availableCities = eventCities.length > 0 ? eventCities : ['Near Me', ...usCities.map((c) => `${c.name}, ${c.state}`).sort()];
  const availableVibes = Array.from(new Set(events.flatMap(event => event.tags || []))).sort();
  const availableHosts = Array.from(new Set(events.map(event => event.organizerName))).sort();

  const groupedEvents = filteredEvents.reduce((acc, event) => {
    const dateKey = new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' });
    acc[dateKey] = acc[dateKey] || [];
    acc[dateKey].push(event);
    return acc;
  }, {} as Record<string, Event[]>);

  const filteredPlaces = placeFilter === 'all'
    ? places
    : places.filter(loc => loc.type === placeFilter);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      hotel: '🏨',
      bar: '🍸',
      party: '🎉',
      restaurant: '🍽️',
      event: '🎪',
      venue: '🎭',
    };
    return icons[type] || '📍';
  };

  if (selectedItem) {
    if (selectedItem.type === 'event') {
      const event = selectedItem.data as Event;
      const rsvpStatus = getRSVPStatus(event);
      const totalRSVPs = event.rsvps.going.length + event.rsvps.interested.length;

      return (
        <div className="events-detail">
          <button className="back-button" onClick={() => setSelectedItem(null)}>
            ← Back
          </button>
          {event.photo && (
            <SafeImage src={event.photo} alt={event.title} className="detail-photo" />
          )}
          <div className="detail-content">
            <div className="detail-header">
              <h2>{event.title}</h2>
              {event.nsfw && <span className="nsfw-badge">NSFW</span>}
            </div>
            <div className="event-organizer">
              <SafeImage src={event.organizerPhoto} alt={event.organizerName} className="organizer-photo" />
              <span>{event.organizerName}</span>
            </div>
            <p className="detail-description">{event.description}</p>
            <div className="detail-info">
              <div className="detail-item">
                <span className="detail-icon">📅</span>
                <span>{formatDate(event.date)}</span>
              </div>
              <div className="detail-item">
                <span className="detail-icon">📍</span>
              <span>{event.location}{event.city ? ` • ${event.city}` : ''}</span>
              </div>
              <div className="detail-item">
                <span className="detail-icon">👥</span>
                <span>{totalRSVPs} attending{event.maxAttendees ? ` / ${event.maxAttendees}` : ''}</span>
              </div>
              {event.maxAttendees && event.rsvps.going.length >= event.maxAttendees && (
                <div className="detail-item">
                  <span className="detail-icon">🚫</span>
                  <span style={{ color: '#ff6b6b' }}>Event is full</span>
                </div>
              )}
            </div>
            <div className="detail-tags">
              {event.tags.map((tag, index) => (
                <span key={index} className="tag">{tag}</span>
              ))}
            </div>
            <div className="detail-actions">
              {rsvpStatus === 'going' ? (
                <button className="action-btn going" onClick={() => handleRSVP(event.id, 'notGoing')}>
                  ✓ Going
                </button>
              ) : (
                <button className="action-btn" onClick={() => handleRSVP(event.id, 'going')}>
                  Going
                </button>
              )}
              {rsvpStatus === 'interested' ? (
                <button className="action-btn interested" onClick={() => handleRSVP(event.id, 'notGoing')}>
                  ⭐ Interested
                </button>
              ) : (
                <button className="action-btn" onClick={() => handleRSVP(event.id, 'interested')}>
                  Interested
                </button>
              )}
              <button
                className={`action-btn ${hasCheckedIn ? 'going' : ''}`}
                onClick={handleCheckIn}
                disabled={hasCheckedIn}
              >
                {hasCheckedIn ? '✓ Checked In' : '📍 Check In'}
              </button>
            </div>
            {checkIns.length > 0 && (
              <div className="checkins-section">
                <h4>Here now ({checkIns.length})</h4>
                <p className="checkins-note">People who checked in at this event</p>
              </div>
            )}
          </div>
        </div>
      );
    } else {
      const place = selectedItem.data as Location;
      return (
        <div className="events-detail">
          <button className="back-button" onClick={() => setSelectedItem(null)}>
            ← Back
          </button>
          <SafeImage src={place.photo} alt={place.name} className="detail-photo" />
          <div className="detail-content">
            <div className="detail-header">
              <h2>{place.name}</h2>
              <span className="type-badge">{getTypeIcon(place.type)} {place.type}</span>
            </div>
            {place.rating && (
              <div className="rating">
                {'⭐'.repeat(Math.floor(place.rating))} {place.rating}
              </div>
            )}
            <div className="detail-item">
              <span className="detail-icon">📍</span>
              <span>{place.address} • {place.distance} mi away</span>
            </div>
            {place.description && (
              <p className="detail-description">{place.description}</p>
            )}
            <div className="detail-actions">
              <button className="action-btn primary" onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(place.address)}`, '_blank')}>
                Get Directions
              </button>
              <button
                className={`action-btn ${hasCheckedIn ? 'going' : ''}`}
                onClick={handleCheckIn}
                disabled={hasCheckedIn}
              >
                {hasCheckedIn ? '✓ Checked In' : '📍 Check In'}
              </button>
            </div>
            {checkIns.length > 0 && (
              <div className="checkins-section">
                <h4>Here now ({checkIns.length})</h4>
                <p className="checkins-note">People who checked in at this place</p>
              </div>
            )}
          </div>
        </div>
      );
    }
  }

  return (
    <div className="events-container">
      <ToastContainer />
      <div className="events-header">
        <div className="events-title">
          <h2>Go out, link up, or date</h2>
          <p>Find the places and events where real people are showing up.</p>
        </div>
        <div className="events-create-buttons">
          <button className="create-event-btn" onClick={() => setShowCreate(true)}>
            ➕ Create Event
          </button>
          <button className="create-event-btn list-venue-btn" onClick={() => setShowListVenue(true)}>
            📍 List Your Venue
          </button>
        </div>
        
        {/* View Mode Tabs */}
        <div className="view-mode-tabs">
          <button
            className={`view-mode-btn ${viewMode === 'all' ? 'active' : ''}`}
            onClick={() => setViewMode('all')}
          >
            All
          </button>
          <button
            className={`view-mode-btn ${viewMode === 'events' ? 'active' : ''}`}
            onClick={() => setViewMode('events')}
          >
            Events
          </button>
          <button
            className={`view-mode-btn ${viewMode === 'places' ? 'active' : ''}`}
            onClick={() => setViewMode('places')}
          >
            Places
          </button>
          {(viewMode === 'all' || viewMode === 'events') && (
            <button
              className={`view-mode-btn ${eventViewMode === 'calendar' ? 'active' : ''}`}
              onClick={() => setEventViewMode(eventViewMode === 'calendar' ? 'list' : 'calendar')}
            >
              {eventViewMode === 'calendar' ? '📋 List' : '🗓️ Calendar'}
            </button>
          )}
        </div>

        {/* Event Filters */}
        {(viewMode === 'all' || viewMode === 'events') && (
          <div className="events-filters">
            <button className={`filter-btn ${eventFilter === 'all' ? 'active' : ''}`} onClick={() => setEventFilter('all')}>
              All Events
            </button>
            <button className={`filter-btn ${eventFilter === 'going' ? 'active' : ''}`} onClick={() => setEventFilter('going')}>
              Going
            </button>
            <button className={`filter-btn ${eventFilter === 'interested' ? 'active' : ''}`} onClick={() => setEventFilter('interested')}>
              Interested
            </button>
            <button className={`filter-btn ${eventFilter === 'public' ? 'active' : ''}`} onClick={() => setEventFilter('public')}>
              Public
            </button>
            <button className={`filter-btn ${eventFilter === 'private' ? 'active' : ''}`} onClick={() => setEventFilter('private')}>
              Private
            </button>
          </div>
        )}

        {(viewMode === 'all' || viewMode === 'events') && (
          <div className="events-advanced-filters">
            <div className="events-filter-row">
              <label>When</label>
              <div className="events-filter-buttons">
                {(['all', 'today', 'weekend', 'week', 'month'] as DateFilter[]).map(filter => (
                  <button
                    key={filter}
                    className={`filter-btn ${dateFilter === filter ? 'active' : ''}`}
                    onClick={() => setDateFilter(filter)}
                  >
                    {filter === 'all' ? 'Anytime' : filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="events-filter-row">
              <label>City</label>
              <select className="events-select" value={cityFilter} onChange={(e) => setCityFilter(e.target.value)}>
                <option value="all">All</option>
                {availableCities.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>
            <div className="events-filter-row">
              <label>Vibe</label>
              <select className="events-select" value={vibeFilter} onChange={(e) => setVibeFilter(e.target.value)}>
                <option value="all">All</option>
                {availableVibes.map(vibe => (
                  <option key={vibe} value={vibe}>{vibe}</option>
                ))}
              </select>
            </div>
            <div className="events-filter-row">
              <label>Host</label>
              <select className="events-select" value={hostFilter} onChange={(e) => setHostFilter(e.target.value)}>
                <option value="all">All</option>
                {availableHosts.map(host => (
                  <option key={host} value={host}>{host}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Place Filters */}
        {(viewMode === 'all' || viewMode === 'places') && (
          <div className="events-filters">
            <button className={`filter-btn ${placeFilter === 'all' ? 'active' : ''}`} onClick={() => setPlaceFilter('all')}>
              All Places
            </button>
            <button className={`filter-btn ${placeFilter === 'hotel' ? 'active' : ''}`} onClick={() => setPlaceFilter('hotel')}>
              🏨 Hotels
            </button>
            <button className={`filter-btn ${placeFilter === 'bar' ? 'active' : ''}`} onClick={() => setPlaceFilter('bar')}>
              🍸 Bars
            </button>
            <button className={`filter-btn ${placeFilter === 'restaurant' ? 'active' : ''}`} onClick={() => setPlaceFilter('restaurant')}>
              🍽️ Restaurants
            </button>
            <button className={`filter-btn ${placeFilter === 'party' ? 'active' : ''}`} onClick={() => setPlaceFilter('party')}>
              🎉 Parties
            </button>
            <button className={`filter-btn ${placeFilter === 'venue' ? 'active' : ''}`} onClick={() => setPlaceFilter('venue')}>
              🎭 Venues
            </button>
          </div>
        )}
      </div>

      <div className="events-list">
        {/* Show Events */}
        {(viewMode === 'all' || viewMode === 'events') && eventViewMode === 'list' && filteredEvents.map((event) => {
          const rsvpStatus = getRSVPStatus(event);
          const totalRSVPs = event.rsvps.going.length + event.rsvps.interested.length;
          
          return (
            <div key={event.id} className="event-card" onClick={() => setSelectedItem({ type: 'event', data: event })}>
              {event.photo && (
                <SafeImage src={event.photo} alt={event.title} className="event-photo" />
              )}
              <div className="event-content">
                <div className="event-header">
                  <div>
                    <h3 className="event-title">{event.title}</h3>
                    <div className="event-organizer">
                      <SafeImage src={event.organizerPhoto} alt={event.organizerName} className="organizer-photo" />
                      <span>{event.organizerName}</span>
                    </div>
                  </div>
                  {event.nsfw && <span className="nsfw-badge">NSFW</span>}
                </div>
                
                <p className="event-description">{event.description}</p>
                
                <div className="event-details">
                  <div className="event-detail-item">
                    <span className="detail-icon">📅</span>
                    <span>{formatDate(event.date)}</span>
                  </div>
                  <div className="event-detail-item">
                    <span className="detail-icon">📍</span>
                    <span>{event.location}{event.city ? ` • ${event.city}` : ''}</span>
                  </div>
                  <div className="event-detail-item">
                    <span className="detail-icon">👥</span>
                    <span>{totalRSVPs} attending{event.maxAttendees ? ` / ${event.maxAttendees}` : ''}</span>
                  </div>
                </div>

                <div className="event-tags">
                  {event.tags.map((tag, index) => (
                    <span key={index} className="event-tag">{tag}</span>
                  ))}
                </div>

                <div className="event-rsvp" onClick={(e) => e.stopPropagation()}>
                  {rsvpStatus === 'going' ? (
                    <button className="rsvp-btn going" onClick={() => handleRSVP(event.id, 'notGoing')}>
                      ✓ Going
                    </button>
                  ) : (
                    <button className="rsvp-btn" onClick={() => handleRSVP(event.id, 'going')}>
                      Going
                    </button>
                  )}
                  {rsvpStatus === 'interested' ? (
                    <button className="rsvp-btn interested" onClick={() => handleRSVP(event.id, 'notGoing')}>
                      ⭐ Interested
                    </button>
                  ) : (
                    <button className="rsvp-btn" onClick={() => handleRSVP(event.id, 'interested')}>
                      Interested
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {(viewMode === 'all' || viewMode === 'events') && eventViewMode === 'calendar' && (
          <div className="events-calendar">
            {Object.entries(groupedEvents).map(([dateKey, dayEvents]) => (
              <div key={dateKey} className="events-calendar-group">
                <div className="events-calendar-date">{dateKey}</div>
                {dayEvents.map(event => {
                  const rsvpStatus = getRSVPStatus(event);
                  const totalRSVPs = event.rsvps.going.length + event.rsvps.interested.length;
                  return (
                    <div key={event.id} className="event-card" onClick={() => setSelectedItem({ type: 'event', data: event })}>
                      {event.photo && (
                        <SafeImage src={event.photo} alt={event.title} className="event-photo" />
                      )}
                      <div className="event-content">
                        <div className="event-header">
                          <div>
                            <h3 className="event-title">{event.title}</h3>
                            <div className="event-organizer">
                              <SafeImage src={event.organizerPhoto} alt={event.organizerName} className="organizer-photo" />
                              <span>{event.organizerName}</span>
                            </div>
                          </div>
                          {event.nsfw && <span className="nsfw-badge">NSFW</span>}
                        </div>
                        <div className="event-details">
                          <div className="event-detail-item">
                            <span className="detail-icon">📍</span>
                            <span>{event.location}{event.city ? ` • ${event.city}` : ''}</span>
                          </div>
                          <div className="event-detail-item">
                            <span className="detail-icon">👥</span>
                            <span>{totalRSVPs} attending</span>
                          </div>
                        </div>
                        <div className="event-tags">
                          {event.tags.map((tag, index) => (
                            <span key={index} className="event-tag">{tag}</span>
                          ))}
                        </div>
                        <div className="event-rsvp" onClick={(e) => e.stopPropagation()}>
                          {rsvpStatus === 'going' ? (
                            <button className="rsvp-btn going" onClick={() => handleRSVP(event.id, 'notGoing')}>
                              ✓ Going
                            </button>
                          ) : (
                            <button className="rsvp-btn" onClick={() => handleRSVP(event.id, 'going')}>
                              Going
                            </button>
                          )}
                          {rsvpStatus === 'interested' ? (
                            <button className="rsvp-btn interested" onClick={() => handleRSVP(event.id, 'notGoing')}>
                              ⭐ Interested
                            </button>
                          ) : (
                            <button className="rsvp-btn" onClick={() => handleRSVP(event.id, 'interested')}>
                              Interested
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {(viewMode === 'all' || viewMode === 'events') && filteredEvents.length === 0 && (
          <div className="events-empty">
            <div className="empty-icon">📅</div>
            <div className="empty-title">No events yet</div>
            <div className="empty-text">Try changing filters or create your own event.</div>
          </div>
        )}

        {/* Show Places */}
        {(viewMode === 'all' || viewMode === 'places') && filteredPlaces.map((place) => (
          <div key={place.id} className="event-card place-card" onClick={() => setSelectedItem({ type: 'place', data: place })}>
            <SafeImage src={place.photo} alt={place.name} className="event-photo" />
            <div className="event-content">
              <div className="event-header">
                <div>
                  <h3 className="event-title">{place.name}</h3>
                  <div className="event-organizer">
                    <span className="place-type">{getTypeIcon(place.type)} {place.type}</span>
                  </div>
                </div>
                {place.rating && (
                  <span className="rating-badge">⭐ {place.rating}</span>
                )}
              </div>
              
              {place.description && (
                <p className="event-description">{place.description}</p>
              )}
              
              <div className="event-details">
                <div className="event-detail-item">
                  <span className="detail-icon">📍</span>
                  <span>{place.address}</span>
                </div>
                <div className="event-detail-item">
                  <span className="detail-icon">📏</span>
                  <span>{place.distance} mi away</span>
                </div>
              </div>

              <div className="place-actions" onClick={(e) => e.stopPropagation()}>
                <button className="rsvp-btn" onClick={() => setSelectedItem({ type: 'place', data: place })}>
                  View Details
                </button>
                <button className="rsvp-btn secondary">Get Directions</button>
              </div>
            </div>
          </div>
        ))}
        {(viewMode === 'all' || viewMode === 'places') && filteredPlaces.length === 0 && (
          <div className="events-empty">
            <div className="empty-icon">📍</div>
            <div className="empty-title">No places found</div>
            <div className="empty-text">Try switching filters or explore another city.</div>
          </div>
        )}
      </div>

      {showCreate && (
        <CreateEventModal 
          onClose={() => setShowCreate(false)} 
          onEventCreated={async (event) => {
            await createEvent(event);
            showToast(`Event "${event.title}" created successfully!`, 'success');
            setShowCreate(false);
          }}
          onError={(message) => showToast(message, 'error')}
        />
      )}
      {showListVenue && (
        <ListVenueModal
          onClose={() => setShowListVenue(false)}
          onSubmit={async (loc) => {
            await createLocation(loc);
            showToast('Venue submitted for review! We\'ll add it soon.', 'success');
          }}
        />
      )}
    </div>
  );
}

function CreateEventModal({
  onClose,
  onEventCreated,
  onError,
}: {
  onClose: () => void;
  onEventCreated?: (event: Event) => Promise<void> | void;
  onError?: (message: string) => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [city, setCity] = useState('');
  const [date, setDate] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [nsfw, setNsfw] = useState(false);
  const [tags, setTags] = useState('');
  const [maxAttendees, setMaxAttendees] = useState('');

  const handleCreate = () => {
    if (!title.trim() || !description.trim() || !location.trim() || !date) {
      onError?.('Please fill in all required fields.');
      return;
    }
    
    try {
      const userProfile = storage.getUserProfile();
      const eventDate = new Date(date).getTime();
      
      if (isNaN(eventDate)) {
        onError?.('Please enter a valid date and time.');
        return;
      }
      
    const newEvent: Event = {
        id: `event-${Date.now()}`,
        title: title.trim(),
        description: description.trim(),
        organizerId: 'me',
        organizerName: userProfile?.name || 'You',
        organizerPhoto: userProfile?.photos?.[0] || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop',
        date: eventDate,
        location: location.trim(),
      city: city.trim() || userProfile?.currentCity || 'Near Me',
        lat: 40.7128,
        lng: -74.0060,
        isPublic,
        rsvps: {
          going: [],
          interested: [],
          notGoing: [],
        },
        tags: tags
        .split(',')
        .map(tag => tag.trim())
        .filter(Boolean),
        nsfw,
        maxAttendees: maxAttendees ? parseInt(maxAttendees, 10) : undefined,
      };
      
      if (onEventCreated) {
        onEventCreated(newEvent);
      }
      
      setTitle('');
      setDescription('');
      setLocation('');
    setCity('');
      setDate('');
      setIsPublic(true);
      setNsfw(false);
    setTags('');
      
      onClose();
    } catch (error) {
      console.error('Error creating event:', error);
      onError?.('Failed to create event. Please try again.');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Create Event</h2>
        <input
          type="text"
          placeholder="Event Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="modal-input"
        />
        <textarea
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="modal-input"
          rows={4}
        />
        <input
          type="text"
          placeholder="Location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="modal-input"
        />
        <input
          type="text"
          placeholder="City (e.g., New York, NY)"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="modal-input"
        />
        <input
          type="datetime-local"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="modal-input"
        />
        <input
          type="number"
          placeholder="Max attendees (optional)"
          value={maxAttendees}
          onChange={(e) => setMaxAttendees(e.target.value)}
          className="modal-input"
          min={1}
        />
        <input
          type="text"
          placeholder="Tags / Vibe (comma separated)"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          className="modal-input"
        />
        <div className="modal-options">
          <label>
            <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
            Public Event
          </label>
          <label>
            <input type="checkbox" checked={nsfw} onChange={(e) => setNsfw(e.target.checked)} />
            NSFW
          </label>
        </div>
        <div className="modal-actions">
          <button className="modal-btn cancel" onClick={onClose}>Cancel</button>
          <button className="modal-btn primary" onClick={handleCreate}>Create</button>
        </div>
      </div>
    </div>
  );
}
