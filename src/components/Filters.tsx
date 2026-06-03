import { useState } from 'react';
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
  tribe?: string[];
  relationshipStatus?: string[];
  hivStatus?: string[];
  sortBy?: 'smart' | 'recent';
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
    tribe: filters.tribe || [],
    relationshipStatus: filters.relationshipStatus || [],
    hivStatus: filters.hivStatus || [],
    sortBy: filters.sortBy || 'smart',
  });

  const vibeOptions = ['Party', 'Chill', 'Romantic', 'Wild', 'Travel'];
  const bodyTypeOptions = ['Slim', 'Athletic', 'Average', 'Muscular', 'Bear', 'Dad bod'];
  const tribeOptions = ['Bear', 'Otter', 'Jock', 'Twink', 'Daddy', 'Trans', 'Leather', 'Punk', 'Geek', 'Gym', 'Muscle', 'Chub', 'Skinny', 'Drag', 'Queer', 'Bi'];
  const relationshipOptions = ['Single', 'Dating', 'Open relationship', 'Married', 'Polyamorous'];
  const hivOptions = ['Negative', 'Positive', 'Undetectable', 'On PrEP'];

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
      tribe: [],
      relationshipStatus: [],
      hivStatus: [],
      sortBy: 'smart',
    };
    setLocalFilters(defaultFilters);
    storage.saveFilters({});
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

        <div className="filter-section">
          <label className="filter-label">Tribe</label>
          <div className="filter-interests">
            {tribeOptions.map((t) => (
              <button
                key={t}
                className={`filter-interest-tag ${localFilters.tribe?.includes(t) ? 'active' : ''}`}
                onClick={() => {
                  const current = localFilters.tribe || [];
                  setLocalFilters(prev => ({
                    ...prev,
                    tribe: current.includes(t)
                      ? current.filter(x => x !== t)
                      : [...current, t],
                  }));
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-section">
          <label className="filter-label">Relationship Status</label>
          <div className="filter-checkboxes">
            {relationshipOptions.map((rs) => (
              <label key={rs} className="filter-checkbox">
                <input
                  type="checkbox"
                  checked={localFilters.relationshipStatus?.includes(rs) || false}
                  onChange={(e) => {
                    const current = localFilters.relationshipStatus || [];
                    setLocalFilters(prev => ({
                      ...prev,
                      relationshipStatus: e.target.checked
                        ? [...current, rs]
                        : current.filter(x => x !== rs),
                    }));
                  }}
                />
                <span>{rs}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="filter-section">
          <label className="filter-label">HIV Status</label>
          <div className="filter-checkboxes">
            {hivOptions.map((hs) => (
              <label key={hs} className="filter-checkbox">
                <input
                  type="checkbox"
                  checked={localFilters.hivStatus?.includes(hs) || false}
                  onChange={(e) => {
                    const current = localFilters.hivStatus || [];
                    setLocalFilters(prev => ({
                      ...prev,
                      hivStatus: e.target.checked
                        ? [...current, hs]
                        : current.filter(x => x !== hs),
                    }));
                  }}
                />
                <span>{hs}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="filter-section">
          <label className="filter-label">Sort By</label>
          <div className="filter-interests">
            <button
              className={`filter-interest-tag ${localFilters.sortBy === 'smart' ? 'active' : ''}`}
              onClick={() => setLocalFilters(prev => ({ ...prev, sortBy: 'smart' }))}
            >
              Smart
            </button>
            <button
              className={`filter-interest-tag ${localFilters.sortBy === 'recent' ? 'active' : ''}`}
              onClick={() => setLocalFilters(prev => ({ ...prev, sortBy: 'recent' }))}
            >
              Recently Active
            </button>
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
