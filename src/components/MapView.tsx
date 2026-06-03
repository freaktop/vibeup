import { useEffect, useRef, useState } from 'react';
import SafeImage from './SafeImage';
import { Profile } from '../types';
import { config } from '../config/api';
import { trackEvent } from '../utils/telemetry';
import './MapView.css';

const THEME_STYLES: Record<string, any[] | undefined> = {
  cruise: [
    { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0d47a1' }] },
    { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#1a237e' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#283593' }] },
  ],
  explore: [
    { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#1b5e20' }] },
    { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#2e7d32' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#388e3c' }] },
  ],
  sneaky: [
    { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#b71c1c' }] },
    { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#c62828' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#d32f2f' }] },
  ],
  whosout: [
    { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#4a148c' }] },
    { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#6a1b9a' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#7b1fa2' }] },
  ],
};

interface MapViewProps {
  profiles: Profile[];
  onProfileClick: (profile: Profile) => void;
  centerLat?: number;
  centerLng?: number;
  zoom?: number;
  userLocation?: { latitude: number; longitude: number };
  mapTheme?: 'cruise' | 'explore' | 'sneaky' | 'whosout' | 'default';
}

declare global {
  interface Window {
    google: any;
    initMapCallback: () => void;
  }
}

export default function MapView({
  profiles,
  onProfileClick,
  centerLat = 40.7128,
  centerLng = -74.0060,
  zoom = 13,
  userLocation,
  mapTheme,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const markers = useRef<any[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [mapLoadError, setMapLoadError] = useState<string | null>(null);
  const [isLoadingMap, setIsLoadingMap] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [mapsLoaded, setMapsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadGoogleMaps = () => {
      if (!config.googleMaps.apiKey) {
        setMapLoadError('Google Maps API key not configured');
        return;
      }

      setIsLoadingMap(true);
      setMapLoadError(null);

      // Check if Google Maps is already loaded
      if (window.google && window.google.maps) {
        if (!cancelled) {
          setIsLoadingMap(false);
          setMapsLoaded(true);
        }
        return;
      }

      // Load Google Maps script
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${config.googleMaps.apiKey}&callback=initMapCallback&libraries=marker&loading=async`;
      script.async = true;
      script.defer = true;

      window.initMapCallback = () => {
        if (!cancelled) {
          setIsLoadingMap(false);
          setMapsLoaded(true);
        }
      };

      script.onerror = () => {
        console.error('Failed to load Google Maps');
        if (!cancelled) {
          setMapLoadError('Unable to load map right now');
          trackEvent('google_maps_fallback_triggered', { reason: 'Script load failed' });
          setIsLoadingMap(false);
        }
      };

      document.head.appendChild(script);

      return () => {
        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
      };
    };

    loadGoogleMaps();

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const retryMapLoad = () => {
    trackEvent('google_maps_retry_clicked');
    setMapLoadError(null);
    setReloadToken((value) => value + 1);
  };

  useEffect(() => {
    if (!window.google || !window.google.maps) {
      return;
    }

    if (!mapContainer.current) {
      console.log('Map container not available');
      return;
    }
    
    if (!config.googleMaps.apiKey) {
      console.warn('⚠️ Google Maps not configured. Add VITE_GOOGLE_MAPS_API_KEY to .env');
      return;
    }

    // Don't re-initialize if map already exists
    if (map.current) {
      console.log('Map already initialized, skipping...');
      return;
    }

    try {
      // Initialize Google Maps
      console.log('Initializing Google Maps map...');

      // Initialize map
      const mapOptions: any = {
        center: { lat: centerLat, lng: centerLng },
        zoom: zoom,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }],
          },
        ],
      };
      if (config.googleMaps.mapId) {
        mapOptions.mapId = config.googleMaps.mapId;
      }
      map.current = new window.google.maps.Map(mapContainer.current, mapOptions);

      console.log('Map loaded successfully');
      trackEvent('map_view_ready');

      // Cleanup
      return () => {
        console.log('Cleaning up map...');
        // Remove all markers first
        markers.current.forEach(marker => {
          try {
            marker.setMap(null);
          } catch (e) {
            // Ignore errors during cleanup
          }
        });
        markers.current = [];
        
        if (map.current) {
          try {
            map.current = null;
          } catch (e) {
            console.error('Error removing map:', e);
          }
        }
      };
    } catch (error) {
      console.error('Error initializing map:', error);
    }
  }, [centerLat, centerLng, zoom, mapsLoaded]); // Initialize when Google Maps is loaded

  // Apply map theme styles
  useEffect(() => {
    if (!map.current || !window.google?.maps) return;
    const styles = THEME_STYLES[mapTheme || ''] || [
      { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
    ];
    map.current.setOptions({ styles });
  }, [mapTheme]);

  // Update map center when it changes
  useEffect(() => {
    if (map.current) {
      map.current.panTo({ lat: centerLat, lng: centerLng });
      map.current.setZoom(zoom);
    }
  }, [centerLat, centerLng, zoom]);

  // Update markers when profiles change
  useEffect(() => {
    if (!map.current || !window.google || !window.google.maps) {
      return;
    }

    const updateMarkers = () => {
      if (!map.current) return;
      
      try {
        // Remove existing markers
        markers.current.forEach(marker => {
          try {
            if (typeof marker.setMap === 'function') {
              marker.setMap(null);
            } else {
              marker.map = null;
            }
          } catch (e) {
            // Marker already removed, ignore
          }
        });
        markers.current = [];

        // Add "You" marker for current user location
        if (userLocation) {
          try {
            const youEl = document.createElement('div');
            youEl.style.width = '16px';
            youEl.style.height = '16px';
            youEl.style.borderRadius = '50%';
            youEl.style.background = '#3b82f6';
            youEl.style.border = '3px solid #fff';
            youEl.style.boxShadow = '0 0 8px rgba(59,130,246,0.6), 0 0 0 4px rgba(59,130,246,0.2)';
            youEl.style.position = 'relative';

            const youMarker = new window.google.maps.Marker({
              position: { lat: userLocation.latitude, lng: userLocation.longitude },
              map: map.current,
              title: 'You',
              icon: {
                path: window.google.maps.SymbolPath.CIRCLE,
                scale: 8,
                fillColor: '#3b82f6',
                fillOpacity: 1,
                strokeColor: '#fff',
                strokeWeight: 3,
              },
              zIndex: 9999,
            });
            markers.current.push(youMarker);
          } catch (e) {
            console.error('Error creating you marker:', e);
          }
        }

        // Add markers for each profile
        profiles.forEach((profile) => {
          if (!profile.lat || !profile.lng || !map.current) return;

          try {
            const photoUrl = profile.photo || profile.photos?.[0] || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name || 'User')}&background=ff2d95&color=fff&size=48&rounded=true&bold=true`;
            const profileName = profile.name ?? 'User';
            const profileAge = profile.age ?? '';

            // Create distance label element
            const distanceLabel = document.createElement('div');
            const dist = profile.distance !== undefined ? `${profile.distance}mi` : '';
            distanceLabel.textContent = dist;
            distanceLabel.style.color = '#fff';
            distanceLabel.style.fontSize = '10px';
            distanceLabel.style.fontWeight = '600';
            distanceLabel.style.textAlign = 'center';
            distanceLabel.style.textShadow = '0 1px 3px rgba(0,0,0,0.8)';
            distanceLabel.style.marginTop = '2px';
            distanceLabel.style.lineHeight = '1';

            // Container for marker + label
            const container = document.createElement('div');
            container.style.display = 'flex';
            container.style.flexDirection = 'column';
            container.style.alignItems = 'center';
            container.style.cursor = 'pointer';

            // Create custom marker element - tiny circular profile pic
            const el = document.createElement('div');
            el.className = 'google-maps-marker';
            el.style.width = '24px';
            el.style.height = '24px';
            el.style.borderRadius = '50%';
            el.style.backgroundImage = `url(${photoUrl})`;
            el.style.backgroundSize = 'cover';
            el.style.backgroundPosition = 'center';
            el.style.border = '2px solid #FF6B9D';
            el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.4)';
            el.style.position = 'relative';
            el.style.flexShrink = '0';

            // Add going out badge (small dot)
            if (profile.goingOutTonight) {
              el.style.borderColor = '#7c3aed';
              const dot = document.createElement('div');
              dot.style.position = 'absolute';
              dot.style.top = '-2px';
              dot.style.right = '-2px';
              dot.style.width = '8px';
              dot.style.height = '8px';
              dot.style.borderRadius = '50%';
              dot.style.background = '#7c3aed';
              dot.style.border = '1.5px solid #0a0a0f';
              dot.style.zIndex = '1000';
              el.appendChild(dot);
            } else if (profile.hookUpNow) {
              el.style.borderColor = '#ff4444';
              const dot = document.createElement('div');
              dot.style.position = 'absolute';
              dot.style.top = '-2px';
              dot.style.right = '-2px';
              dot.style.width = '8px';
              dot.style.height = '8px';
              dot.style.borderRadius = '50%';
              dot.style.background = '#ff4444';
              dot.style.border = '1.5px solid #0a0a0f';
              dot.style.zIndex = '1000';
              el.appendChild(dot);
            }

            container.appendChild(el);
            container.appendChild(distanceLabel);

            // Create marker with AdvancedMarkerElement (supports custom HTML content)
            const useAdvanced = !!window.google.maps.marker?.AdvancedMarkerElement;
            if (useAdvanced) {
              const marker = new window.google.maps.marker.AdvancedMarkerElement({
                position: { lat: profile.lat, lng: profile.lng },
                map: map.current,
                title: `${profileName}${profileAge ? ', ' + profileAge : ''}${dist ? ' · ' + dist : ''}`,
                content: container,
              });
              marker.addListener('gmp-click', () => {
                try {
                  setSelectedProfile(profile);
                  onProfileClick(profile);
                } catch (error) {
                  console.error('Error handling profile click:', error);
                }
              });
              markers.current.push(marker);
            } else {
              // Fallback for browsers without AdvancedMarkerElement
              const marker = new window.google.maps.Marker({
                position: { lat: profile.lat, lng: profile.lng },
                map: map.current,
                title: `${profileName}${profileAge ? ', ' + profileAge : ''}${dist ? ' · ' + dist : ''}`,
                icon: {
                  url: photoUrl,
                  scaledSize: new window.google.maps.Size(24, 24),
                  anchor: new window.google.maps.Point(12, 12),
                  shape: { type: 'circle', coords: [12, 12, 12] },
                },
              });
              marker.addListener('click', () => {
                try {
                  setSelectedProfile(profile);
                  onProfileClick(profile);
                } catch (error) {
                  console.error('Error handling profile click:', error);
                }
              });
              markers.current.push(marker);
            }
          } catch (error) {
            console.error('Error creating marker for profile:', profile.id, error);
          }
        });

        // Fit map to show all markers only if we have profiles
        if (markers.current.length > 0 && map.current) {
          try {
            const bounds = new window.google.maps.LatLngBounds();
            markers.current.forEach(marker => {
              try {
                bounds.extend(marker.getPosition());
              } catch (e) {
                // Skip invalid marker
              }
            });
            
            // Add user location to bounds if available
            if (userLocation) {
              bounds.extend({ lat: userLocation.latitude, lng: userLocation.longitude });
            }

            map.current.fitBounds(bounds, 50);
          } catch (error) {
            console.error('Error fitting bounds:', error);
          }
        }
      } catch (error) {
        console.error('Error updating markers:', error);
      }
    };

    updateMarkers();
  }, [profiles, userLocation]); // Removed onProfileClick from deps to prevent loops


  if (!config.googleMaps.apiKey) {
    return (
      <div className="map-view-container map-error">
        <div className="map-error-message">
          <div>🗺️</div>
          <h3>Map Not Configured</h3>
          <p>Please add your Google Maps API key to the .env file</p>
          <p style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
            VITE_GOOGLE_MAPS_API_KEY=your_key_here
          </p>
        </div>
      </div>
    );
  }

  if (mapLoadError) {
    const cachedProfiles = profiles.filter((profile) => profile.lat && profile.lng).slice(0, 8);

    return (
      <div className="map-view-container map-error">
        <div className="map-error-message">
          <div>🗺️</div>
          <h3>Map unavailable right now</h3>
          <p>{mapLoadError}</p>
          <button onClick={retryMapLoad} style={{ marginTop: '8px' }}>Retry</button>
          {cachedProfiles.length > 0 && (
            <div style={{ marginTop: '12px', textAlign: 'left' }}>
              <p style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>Nearby profiles (list fallback)</p>
              {cachedProfiles.map((profile) => (
                <button
                  key={profile.id}
                  onClick={() => {
                    setSelectedProfile(profile);
                    onProfileClick(profile);
                  }}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    marginBottom: '6px',
                    padding: '8px',
                  }}
                >
                  {profile.name}, {profile.age}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!window.google || !window.google.maps) {
    return (
      <div className="map-view-container map-error">
        <div className="map-error-message">
          <div>🗺️</div>
          <h3>{isLoadingMap ? 'Loading Map…' : 'Preparing Map…'}</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="map-view-container">
      <div ref={mapContainer} className="google-maps-map" style={{ width: '100%', height: '100%' }} />
      {selectedProfile && (
        <div className="map-profile-preview" onClick={() => onProfileClick(selectedProfile)}>
          <SafeImage src={selectedProfile.photo} alt={selectedProfile.name} className="preview-avatar" />
          <div className="preview-info">
            <div className="preview-name">{selectedProfile.name}, {selectedProfile.age}</div>
            {selectedProfile.online && <div className="preview-online">● Online now</div>}
            <div className="preview-distance">{selectedProfile.distance !== undefined ? `${selectedProfile.distance} mi` : 'Nearby'}</div>
            {selectedProfile.hookUpNow && (
              <div className="preview-hookup">🔥 Available Now</div>
            )}
            {selectedProfile.goingOutTonight && (
              <div className="preview-outtonight">🌙 Out Tonight</div>
            )}
          </div>
          <button className="preview-chat-btn" onClick={(e) => { e.stopPropagation(); onProfileClick(selectedProfile); }}>→</button>
        </div>
      )}
    </div>
  );
}
