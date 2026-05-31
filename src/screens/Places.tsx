import { useEffect, useState } from 'react';
import { listenLocations } from '../firestore';
import { mockLocations } from '../data/mockLocations';
import { Location } from '../types';
import SafeImage from '../components/SafeImage';
import './Places.css';

type FilterType = 'all' | 'hotel' | 'bar' | 'party' | 'restaurant' | 'event' | 'venue';

export default function Places() {
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);

  useEffect(() => {
    const unsubscribe = listenLocations((rows) => {
      setLocations(rows);
    });

    return () => unsubscribe();
  }, []);

  const locationsToShow = locations.length > 0 ? locations : mockLocations;
  const filteredLocations = filter === 'all'
    ? locationsToShow
    : locationsToShow.filter(loc => loc.type === filter);

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

  if (selectedLocation) {
    return (
      <div className="explore-detail">
        <button className="back-button" onClick={() => setSelectedLocation(null)}>
          ← Back
        </button>
        <img src={selectedLocation.photo} alt={selectedLocation.name} className="location-detail-photo" />
        <div className="location-detail-content">
          <div className="location-detail-header">
            <h2>{selectedLocation.name}</h2>
            <span className="location-type-badge">
              {getTypeIcon(selectedLocation.type)} {selectedLocation.type}
            </span>
          </div>
          {selectedLocation.rating && (
            <div className="location-rating">
              {'⭐'.repeat(Math.floor(selectedLocation.rating))} {selectedLocation.rating}
            </div>
          )}
          <div className="location-address">
            📍 {selectedLocation.address} • {selectedLocation.distance} miles away
          </div>
          {selectedLocation.description && (
            <div className="location-description">{selectedLocation.description}</div>
          )}
          <button className="location-action-btn">Get Directions</button>
          <button className="location-action-btn secondary">Check In</button>
        </div>
      </div>
    );
  }

  return (
    <div className="explore-container">
      <div className="explore-filters">
        <button
          className={`filter-tag ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        <button
          className={`filter-tag ${filter === 'hotel' ? 'active' : ''}`}
          onClick={() => setFilter('hotel')}
        >
          🏨 Hotels
        </button>
        <button
          className={`filter-tag ${filter === 'bar' ? 'active' : ''}`}
          onClick={() => setFilter('bar')}
        >
          🍸 Bars
        </button>
        <button
          className={`filter-tag ${filter === 'party' ? 'active' : ''}`}
          onClick={() => setFilter('party')}
        >
          🎉 Parties
        </button>
        <button
          className={`filter-tag ${filter === 'restaurant' ? 'active' : ''}`}
          onClick={() => setFilter('restaurant')}
        >
          🍽️ Restaurants
        </button>
        <button
          className={`filter-tag ${filter === 'event' ? 'active' : ''}`}
          onClick={() => setFilter('event')}
        >
          🎪 Events
        </button>
      </div>

      <div className="explore-grid">
        {filteredLocations.length === 0 && (
          <div className="explore-empty">No places available yet for this filter.</div>
        )}
        {filteredLocations.map((location) => (
          <div
            key={location.id}
            className="location-card"
            onClick={() => setSelectedLocation(location)}
          >
            <div className="location-card-image-container">
              <SafeImage src={location.photo} alt={location.name} className="location-card-image" />
              <div className="location-card-overlay">
                <span className="location-type-icon">{getTypeIcon(location.type)}</span>
                {location.rating && (
                  <span className="location-rating-badge">
                    ⭐ {location.rating}
                  </span>
                )}
              </div>
            </div>
            <div className="location-card-info">
              <h3 className="location-card-name">{location.name}</h3>
              <div className="location-card-details">
                <span>📍 {location.distance} mi</span>
                <span className="location-card-type">{location.type}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
