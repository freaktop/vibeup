import React, { useState } from 'react';
import { storage } from '../utils/storage';
import './Filters.css';

export interface FilterSettings {
  minAge: number;
  maxAge: number;
  maxDistance: number;
  interests: string[];
  kinks?: string[];
  lookingFor?: string[];
  sexualOrientation?: string[];
  genderIdentity?: string[];
  vibeType?: string[];
  outTonightOnly?: boolean;
  verifiedOnly?: boolean;
  bodyType?: string[];
}

interface FiltersProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterSettings;
  onApply: (filters: FilterSettings) => void;
  availableInterests: string[];
  availableKinks?: string[];
  availableLookingFor?: string[];
}

export default function Filters({
  isOpen,
  onClose,
  filters,
  onApply,
  availableInterests,
  availableKinks = [],
  availableLookingFor = [],
}: FiltersProps) {
  const [localFilters, setLocalFilters] = useState<FilterSettings>({
    ...filters,
    kinks: filters.kinks || [],
    lookingFor: filters.lookingFor || [],
    sexualOrientation: filters.sexualOrientation || [],
    genderIdentity: filters.genderIdentity || [],
    vibeType: filters.vibeType || [],
    outTonightOnly: filters.outTonightOnly || false,
    verifiedOnly: filters.verifiedOnly || false,
    bodyType: filters.bodyType || [],
  });

  const vibeOptions = ['Party', 'Chill', 'Romantic', 'Wild', 'Travel'];
  const bodyTypeOptions = ['Slim', 'Athletic', 'Average', 'Muscular', 'Bear', 'Dad bod'];

  if (!isOpen) return null;

  const handleInterestToggle = (interest: string) => {
    setLocalFilters(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest],
    }));
  };

  const handleApply = () => {
    onApply(localFilters);
    onClose();
  };

  const handleReset = () => {
    const defaultFilters: FilterSettings = {
      minAge: 18,
      maxAge: 50,
      maxDistance: 100,
      interests: [],
      kinks: [],
      lookingFor: [],
      sexualOrientation: [],
      genderIdentity: [],
      vibeType: [],
      outTonightOnly: false,
      verifiedOnly: false,
      bodyType: [],
    };
    setLocalFilters(defaultFilters);
    storage.clearFilters();
    onApply(defaultFilters);
    onClose();
  };

  return (
    <div className="filters-overlay" onClick={onClose}>
      <div className="filters-modal" onClick={(e) => e.stopPropagation()}>
        <div className="filters-header">
          <h2>Filters</h2>
          <button className="filters-close" onClick={onClose}>✕</button>
        </div>

        <div className="filters-content">
          <div className="filter-section">
            <label className="filter-label">Age Range</label>
            <div className="filter-age-range">
              <div className="filter-age-input">
                <label>Min: {localFilters.minAge}</label>
                <input
                  type="range"
                  min="18"
                  max="50"
                  value={localFilters.minAge}
                  onChange={(e) => setLocalFilters(prev => ({
                    ...prev,
                    minAge: parseInt(e.target.value),
                  }))}
                />
              </div>
              <div className="filter-age-input">
                <label>Max: {localFilters.maxAge}</label>
                <input
                  type="range"
                  min="18"
                  max="50"
                  value={localFilters.maxAge}
                  onChange={(e) => setLocalFilters(prev => ({
                    ...prev,
                    maxAge: parseInt(e.target.value),
                  }))}
                />
              </div>
            </div>
          </div>

          <div className="filter-section">
            <label className="filter-label">Max Distance</label>
            <div className="filter-distance">
              <label>{localFilters.maxDistance} miles</label>
              <input
                type="range"
                min="1"
                max="100"
                value={localFilters.maxDistance}
                onChange={(e) => setLocalFilters(prev => ({
                  ...prev,
                  maxDistance: parseInt(e.target.value),
                }))}
              />
            </div>
          </div>

          <div className="filter-section">
            <label className="filter-label">Interests</label>
            <div className="filter-interests">
              {availableInterests.map((interest) => (
                <button
                  key={interest}
                  className={`filter-interest-tag ${
                    localFilters.interests.includes(interest) ? 'active' : ''
                  }`}
                  onClick={() => handleInterestToggle(interest)}
                >
                  {interest}
                </button>
              ))}
            </div>
          </div>

          {availableKinks.length > 0 && (
            <div className="filter-section">
              <label className="filter-label">Kinks / Fetishes</label>
              <div className="filter-interests">
                {availableKinks.map((kink) => (
                  <button
                    key={kink}
                    className={`filter-interest-tag filter-kink-tag ${
                      localFilters.kinks?.includes(kink) ? 'active' : ''
                    }`}
                    onClick={() => {
                      const currentKinks = localFilters.kinks || [];
                      setLocalFilters(prev => ({
                        ...prev,
                        kinks: currentKinks.includes(kink)
                          ? currentKinks.filter(k => k !== kink)
                          : [...currentKinks, kink],
                      }));
                    }}
                  >
                    {kink}
                  </button>
                ))}
              </div>
            </div>
          )}

          {availableLookingFor.length > 0 && (
            <div className="filter-section">
              <label className="filter-label">Looking For</label>
              <div className="filter-interests">
                {availableLookingFor.map((looking) => (
                  <button
                    key={looking}
                    className={`filter-interest-tag ${
                      localFilters.lookingFor?.includes(looking) ? 'active' : ''
                    }`}
                    onClick={() => {
                      const currentLooking = localFilters.lookingFor || [];
                      setLocalFilters(prev => ({
                        ...prev,
                        lookingFor: currentLooking.includes(looking)
                          ? currentLooking.filter(l => l !== looking)
                          : [...currentLooking, looking],
                      }));
                    }}
                  >
                    {looking}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="filter-section">
            <label className="filter-label">Vibe Type</label>
            <div className="filter-interests">
              {vibeOptions.map((vibe) => (
                <button
                  key={vibe}
                  className={`filter-interest-tag ${localFilters.vibeType?.includes(vibe) ? 'active' : ''}`}
                  onClick={() => {
                    const current = localFilters.vibeType || [];
                    setLocalFilters(prev => ({
                      ...prev,
                      vibeType: current.includes(vibe)
                        ? current.filter(v => v !== vibe)
                        : [...current, vibe],
                    }));
                  }}
                >
                  {vibe}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-section">
            <label className="filter-label">Quick Filters</label>
            <div className="filter-checkboxes">
              <label className="filter-checkbox">
                <input
                  type="checkbox"
                  checked={localFilters.outTonightOnly || false}
                  onChange={(e) => setLocalFilters(prev => ({ ...prev, outTonightOnly: e.target.checked }))}
                />
                <span>Out Tonight Only</span>
              </label>
              <label className="filter-checkbox">
                <input
                  type="checkbox"
                  checked={localFilters.verifiedOnly || false}
                  onChange={(e) => setLocalFilters(prev => ({ ...prev, verifiedOnly: e.target.checked }))}
                />
                <span>Verified Only</span>
              </label>
            </div>
          </div>

          <div className="filter-section">
            <label className="filter-label">Body Type</label>
            <div className="filter-interests">
              {bodyTypeOptions.map((body) => (
                <button
                  key={body}
                  className={`filter-interest-tag ${localFilters.bodyType?.includes(body) ? 'active' : ''}`}
                  onClick={() => {
                    const current = localFilters.bodyType || [];
                    setLocalFilters(prev => ({
                      ...prev,
                      bodyType: current.includes(body)
                        ? current.filter(b => b !== body)
                        : [...current, body],
                    }));
                  }}
                >
                  {body}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-section">
            <label className="filter-label">Sexual Orientation</label>
            <div className="filter-checkboxes">
              {['Gay', 'Bisexual', 'Pansexual', 'Queer', 'Asexual'].map((orientation) => (
                <label key={orientation} className="filter-checkbox">
                  <input
                    type="checkbox"
                    checked={localFilters.sexualOrientation?.includes(orientation) || false}
                    onChange={(e) => {
                      const current = localFilters.sexualOrientation || [];
                      setLocalFilters(prev => ({
                        ...prev,
                        sexualOrientation: e.target.checked
                          ? [...current, orientation]
                          : current.filter(o => o !== orientation),
                      }));
                    }}
                  />
                  <span>{orientation}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="filters-footer">
          <button className="filters-reset" onClick={handleReset}>
            Reset
          </button>
          <button className="filters-apply" onClick={handleApply}>
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
}
