import React, { useState } from 'react';
import { Location } from '../types';
import { usCities } from '../data/cities';
import './ListVenueModal.css';

type LocationType = Location['type'];

interface ListVenueModalProps {
  onClose: () => void;
  onSubmit: (location: Omit<Location, 'id'>) => Promise<void>;
}

const LOCATION_TYPES: { value: LocationType; label: string }[] = [
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'bar', label: 'Bar' },
  { value: 'venue', label: 'Venue' },
  { value: 'party', label: 'Party/Club' },
  { value: 'event', label: 'Event Space' },
];

const DEFAULT_PHOTO = 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400&h=300&fit=crop';

export default function ListVenueModal({ onClose, onSubmit }: ListVenueModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<LocationType>('restaurant');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState('');
  const [rating, setRating] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const cityOptions = ['', ...usCities.map((c) => `${c.name}, ${c.state}`).sort()];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim() || !address.trim()) {
      setError('Name and address are required.');
      return;
    }
    setIsSubmitting(true);
    try {
      const coords = city ? usCities.find((c) => `${c.name}, ${c.state}` === city) : null;
      await onSubmit({
        name: name.trim(),
        type,
        address: address.trim(),
        city: city || undefined,
        distance: 0,
        photo: photo.trim() || DEFAULT_PHOTO,
        rating: rating ? parseFloat(rating) : undefined,
        description: description.trim() || undefined,
        lat: coords?.lat,
        lng: coords?.lng,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to submit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="list-venue-overlay" onClick={onClose}>
      <div className="list-venue-modal" onClick={(e) => e.stopPropagation()}>
        <div className="list-venue-header">
          <h2>List Your Venue</h2>
          <button className="list-venue-close" onClick={onClose}>✕</button>
        </div>
        <p className="list-venue-intro">
          Restaurants, hotels, bars, and venues can list their property to reach our community.
        </p>
        <form onSubmit={handleSubmit} className="list-venue-form">
          {error && <div className="list-venue-error">{error}</div>}
          <label>Business Name *</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rainbow Lounge" required />
          <label>Type</label>
          <select value={type} onChange={(e) => setType(e.target.value as LocationType)}>
            {LOCATION_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <label>Full Address *</label>
          <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St, City, State ZIP" required />
          <label>City (for map)</label>
          <select value={city} onChange={(e) => setCity(e.target.value)}>
            {cityOptions.map((opt) => (
              <option key={opt || 'none'} value={opt}>{opt || 'Select city...'}</option>
            ))}
          </select>
          <label>Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Tell people what makes your place special..." rows={3} />
          <label>Photo URL</label>
          <input type="url" value={photo} onChange={(e) => setPhoto(e.target.value)} placeholder="https://..." />
          <label>Rating (1-5, optional)</label>
          <input type="number" min="1" max="5" step="0.1" value={rating} onChange={(e) => setRating(e.target.value)} placeholder="4.5" />
          <div className="list-venue-actions">
            <button type="button" className="list-venue-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="list-venue-submit" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit for Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
