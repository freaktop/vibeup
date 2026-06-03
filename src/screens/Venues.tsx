import { useState, useEffect } from 'react';
import { Location } from '../types';
import { getCurrentUid } from '../auth';
import { listenLocations, listenCheckInsAtLocation, addCheckIn, type CheckIn } from '../firestore';
import SafeImage from '../components/SafeImage';
import { useToast } from '../hooks/useToast';
import './Venues.css';

type Category = 'all' | 'bar' | 'party' | 'restaurant' | 'venue' | 'hotel' | 'gym' | 'park' | 'cruising';

const CATEGORY_ICONS: Record<string, string> = {
  all: '📍',
  bar: '🍸',
  party: '🎉',
  restaurant: '🍽️',
  venue: '🎪',
  hotel: '🏨',
  gym: '💪',
  park: '🌳',
  cruising: '🔞',
};

export default function Venues() {
  const { showToast, ToastContainer } = useToast();
  const [venues, setVenues] = useState<Location[]>([]);
  const [category, setCategory] = useState<Category>('all');
  const [selectedVenue, setSelectedVenue] = useState<Location | null>(null);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const userId = getCurrentUid() ?? 'me';

  useEffect(() => {
    const unsub = listenLocations((rows) => setVenues(rows));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!selectedVenue || !userId) return;
    let unsub: (() => void) | undefined;
    const load = async () => {
      unsub = listenCheckInsAtLocation(selectedVenue.id, (rows) => {
        setCheckIns(rows);
        setHasCheckedIn(rows.some((c) => c.userId === userId));
      });
    };
    load();
    return () => unsub?.();
  }, [selectedVenue, userId]);

  const filteredVenues = venues.filter((v) => {
    if (category !== 'all' && v.type !== category) return false;
    return true;
  });

  const handleCheckIn = async () => {
    if (!selectedVenue) return;
    try {
      await addCheckIn(userId, { locationId: selectedVenue.id, placeName: selectedVenue.name });
      showToast(`Checked in at ${selectedVenue.name}!`, 'success');
    } catch {
      showToast('Failed to check in.', 'error');
    }
  };

  return (
    <div className="venues-container">
      <ToastContainer />
      <div className="venues-categories">
        {Object.entries(CATEGORY_ICONS).map(([key, icon]) => (
          <button
            key={key}
            className={`venues-cat-btn ${category === key ? 'active' : ''}`}
            onClick={() => setCategory(key as Category)}
          >
            {icon}
          </button>
        ))}
      </div>

      <div className="venues-list">
        {filteredVenues.length === 0 && (
          <div className="venues-empty">
            <div className="venues-empty-icon">📍</div>
            <div className="venues-empty-text">No venues found nearby</div>
          </div>
        )}
        {filteredVenues.map((venue) => (
          <div
            key={venue.id}
            className="venues-card"
            onClick={() => setSelectedVenue(venue)}
          >
            <SafeImage src={venue.photo} alt={venue.name} className="venues-card-photo" />
            <div className="venues-card-info">
              <div className="venues-card-name">{venue.name}</div>
              <div className="venues-card-type">{venue.type} · {venue.distance ? `${venue.distance} mi` : 'Nearby'}</div>
              {venue.rating && <div className="venues-card-rating">{'★'.repeat(Math.round(venue.rating))} {venue.rating}</div>}
              <div className="venues-card-address">{venue.address}</div>
            </div>
          </div>
        ))}
      </div>

      {selectedVenue && (
        <div className="venues-modal-overlay" onClick={() => setSelectedVenue(null)}>
          <div className="venues-modal" onClick={(e) => e.stopPropagation()}>
            <SafeImage src={selectedVenue.photo} alt={selectedVenue.name} className="venues-modal-photo" />
            <div className="venues-modal-body">
              <h3>{selectedVenue.name}</h3>
              <div className="venues-modal-type">{selectedVenue.type}</div>
              <div className="venues-modal-address">{selectedVenue.address}</div>
              {selectedVenue.description && <p className="venues-modal-desc">{selectedVenue.description}</p>}
              <div className="venues-modal-checkins">
                <strong>{checkIns.length}</strong> people checked in
              </div>
              <button
                className={`venues-checkin-btn ${hasCheckedIn ? 'checked' : ''}`}
                onClick={handleCheckIn}
                disabled={hasCheckedIn}
              >
                {hasCheckedIn ? '✓ Checked In' : 'Check In'}
              </button>
              <button className="venues-close-btn" onClick={() => setSelectedVenue(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
