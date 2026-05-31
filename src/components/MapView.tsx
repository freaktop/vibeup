import { useEffect, useRef, useState } from 'react';
import SafeImage from './SafeImage';
import { Profile } from '../types';
import { config } from '../config/api';
import { trackEvent } from '../utils/telemetry';
import './MapView.css';

interface MapViewProps {
  profiles: Profile[];
  onProfileClick: (profile: Profile) => void;
  centerLat?: number;
  centerLng?: number;
  zoom?: number;
  userLocation?: { latitude: number; longitude: number };
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
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const markers = useRef<any[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [mapLoadError, setMapLoadError] = useState<string | null>(null);
  const [isLoadingMap, setIsLoadingMap] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

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
        }
        return;
      }

      // Load Google Maps script
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${config.googleMaps.apiKey}&callback=initMapCallback`;
      script.async = true;
      script.defer = true;

      window.initMapCallback = () => {
        if (!cancelled) {
          setIsLoadingMap(false);
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
      map.current = new window.google.maps.Map(mapContainer.current, {
        center: { lat: centerLat, lng: centerLng },
        zoom: zoom,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }],
          },
        ],
      });

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
  }, [centerLat, centerLng, zoom]); // Initialize when Google Maps is loaded

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
      // Map not initialized yet, wait for it
      return;
    }

    const updateMarkers = () => {
      if (!map.current) return;
      
      try {
        // Remove existing markers
        markers.current.forEach(marker => {
          try {
            marker.setMap(null);
          } catch (e) {
            // Marker already removed, ignore
          }
        });
        markers.current = [];

        // Add markers for each profile
        profiles.forEach((profile) => {
          if (!profile.lat || !profile.lng || !map.current) return;

          try {
            const photoUrl = profile.photo || profile.photos?.[0] || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=600&fit=crop';
            const profileName = profile.name ?? 'User';
            const profileAge = profile.age ?? '';

            // Create custom marker element - profile pic as circular marker
            const el = document.createElement('div');
            el.className = 'google-maps-marker';
            el.style.width = '44px';
            el.style.height = '44px';
            el.style.borderRadius = '50%';
            el.style.backgroundImage = `url(${photoUrl})`;
            el.style.backgroundSize = 'cover';
            el.style.backgroundPosition = 'center';
            el.style.border = '3px solid #FF6B9D';
            el.style.cursor = 'pointer';
            el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
            el.style.position = 'relative';

            // Add going out badge
            if (profile.goingOutTonight) {
              const badge = document.createElement('div');
              badge.innerHTML = '🌙';
              badge.style.position = 'absolute';
              badge.style.top = '-5px';
              badge.style.right = '-5px';
              badge.style.fontSize = '16px';
              badge.style.background = '#7c3aed';
              badge.style.borderRadius = '50%';
              badge.style.width = '20px';
              badge.style.height = '20px';
              badge.style.display = 'flex';
              badge.style.alignItems = 'center';
              badge.style.justifyContent = 'center';
              badge.style.zIndex = '1000';
              el.appendChild(badge);
            } else if (profile.hookUpNow) {
              const badge = document.createElement('div');
              badge.innerHTML = '🔥';
              badge.style.position = 'absolute';
              badge.style.top = '-5px';
              badge.style.right = '-5px';
              badge.style.fontSize = '16px';
              badge.style.background = '#FF6B9D';
              badge.style.borderRadius = '50%';
              badge.style.width = '20px';
              badge.style.height = '20px';
              badge.style.display = 'flex';
              badge.style.alignItems = 'center';
              badge.style.justifyContent = 'center';
              badge.style.zIndex = '1000';
              el.appendChild(badge);
            }

            // Create marker
            const marker = new window.google.maps.Marker({
              position: { lat: profile.lat, lng: profile.lng },
              map: map.current,
              title: `${profileName}${profileAge ? ', ' + profileAge : ''}`,
              icon: {
                url: photoUrl,
                scaledSize: new window.google.maps.Size(44, 44),
                anchor: new window.google.maps.Point(22, 22),
              },
            });

            // Add click handler
            marker.addListener('click', () => {
              try {
                setSelectedProfile(profile);
                onProfileClick(profile);
              } catch (error) {
                console.error('Error handling profile click:', error);
              }
            });

            markers.current.push(marker);
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
        <div className="map-profile-preview">
          <SafeImage src={selectedProfile.photo} alt={selectedProfile.name} className="preview-avatar" />
          <div className="preview-info">
            <div className="preview-name">{selectedProfile.name}, {selectedProfile.age}</div>
            <div className="preview-distance">{selectedProfile.distance} mi away</div>
            {selectedProfile.hookUpNow && (
              <div className="preview-hookup">🔥 Available Now</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
