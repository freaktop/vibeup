import { useEffect, useRef, useState } from 'react';
import { Profile } from '../types';
import { config } from '../config/api';
import { loadMapboxGl, resetMapboxLoader } from '../utils/loadMapbox';
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
  const navControlAdded = useRef(false);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [mapboxgl, setMapboxgl] = useState<any>(null);
  const [mapLoadError, setMapLoadError] = useState<string | null>(null);
  const [isLoadingMap, setIsLoadingMap] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const loadMapbox = async () => {
      if (!config.mapbox.accessToken) return;
      setIsLoadingMap(true);
      setMapLoadError(null);

      try {
        const module = await loadMapboxGl();
        if (!cancelled) {
          setMapboxgl(module);
        }
      } catch (error) {
        console.error('Failed to load Mapbox:', error);
        if (!cancelled) {
          const message = error instanceof Error ? error.message : 'Unable to load map right now';
          setMapLoadError(message);
          trackEvent('mapbox_fallback_triggered', { reason: message });
        }
      } finally {
        if (!cancelled) {
          setIsLoadingMap(false);
        }
      }
    };

    loadMapbox();

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const retryMapLoad = () => {
    trackEvent('mapbox_retry_clicked');
    setMapboxgl(null);
    setMapLoadError(null);
    resetMapboxLoader();
    setReloadToken((value) => value + 1);
  };

  useEffect(() => {
    if (!mapboxgl) {
      return;
    }

    if (!mapContainer.current) {
      console.log('Map container not available');
      return;
    }
    
    if (!config.mapbox.accessToken) {
      console.warn('⚠️ Mapbox not configured. Add VITE_MAPBOX_ACCESS_TOKEN to .env');
      return;
    }

    // Don't re-initialize if map already exists
    if (map.current) {
      console.log('Map already initialized, skipping...');
      return;
    }

    try {
      // Set Mapbox access token
      mapboxgl.accessToken = config.mapbox.accessToken;
      console.log('Initializing Mapbox map...');

      // Initialize map
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [centerLng, centerLat],
        zoom: zoom,
      });

      // Handle map errors
      map.current.on('error', (e: any) => {
        console.error('Mapbox error:', e);
        trackEvent('mapbox_runtime_error', {
          message: e?.error?.message || e?.type || 'unknown',
        });
      });

      // Wait for map to load before adding controls
      map.current.on('load', () => {
        console.log('Map loaded successfully');
        trackEvent('map_view_ready');
        // Add navigation controls
        if (map.current && !navControlAdded.current) {
          try {
            map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
            navControlAdded.current = true;
          } catch (e) {
            console.error('Error adding navigation control:', e);
          }
        }
      });

      // Cleanup
      return () => {
        console.log('Cleaning up map...');
        // Remove all markers first
        markers.current.forEach(marker => {
          try {
            marker.remove();
          } catch (e) {
            // Ignore errors during cleanup
          }
        });
        markers.current = [];
        
        if (map.current) {
          try {
            map.current.remove();
          } catch (e) {
            console.error('Error removing map:', e);
          }
          map.current = null;
        }
      };
    } catch (error) {
      console.error('Error initializing map:', error);
    }
  }, [mapboxgl]); // Initialize once Mapbox library is loaded

  // Update map center when it changes
  useEffect(() => {
    if (map.current) {
      map.current.flyTo({
        center: [centerLng, centerLat],
        zoom: zoom,
        duration: 1000,
      });
    }
  }, [centerLat, centerLng, zoom]);

  // Update markers when profiles change
  useEffect(() => {
    if (!map.current || !mapboxgl) {
      // Map not initialized yet, wait for it
      return;
    }

    // Wait for map to be ready before updating markers
    const updateMarkersWhenReady = () => {
      if (!map.current) return;
      
      try {
        // Remove existing markers
        markers.current.forEach(marker => {
          try {
            marker.remove();
          } catch (e) {
            // Marker already removed, ignore
          }
        });
        markers.current = [];

        // Add markers for each profile
        profiles.forEach((profile) => {
          if (!profile.lat || !profile.lng || !map.current) return;

          try {
            // Create custom marker element
            const el = document.createElement('div');
            el.className = 'mapbox-marker';
            el.style.width = '40px';
            el.style.height = '40px';
            el.style.borderRadius = '50%';
            el.style.backgroundImage = `url(${profile.photo})`;
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
            const marker = new mapboxgl.Marker(el)
              .setLngLat([profile.lng, profile.lat])
              .setPopup(
                new mapboxgl.Popup({ offset: 25 }).setHTML(`
                  <div class="map-popup">
                    <img src="${profile.photo}" alt="${profile.name}" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover; margin-bottom: 8px;">
                    <div style="font-weight: 600; margin-bottom: 4px;">${profile.name}, ${profile.age}</div>
                    <div style="font-size: 12px; color: #666;">${profile.distance !== undefined ? profile.distance + ' mi away' : 'Distance unknown'}</div>
                    ${profile.goingOutTonight ? '<div style="color: #7c3aed; font-size: 12px; margin-top: 4px;">🌙 Going Out Tonight</div>' : profile.hookUpNow ? '<div style="color: #FF6B9D; font-size: 12px; margin-top: 4px;">🔥 Available Now</div>' : ''}
                  </div>
                `)
              )
              .addTo(map.current);

            // Add click handler - use current profile in closure
            const currentProfile = profile;
            el.addEventListener('click', () => {
              try {
                setSelectedProfile(currentProfile);
                onProfileClick(currentProfile);
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
            const bounds = new mapboxgl.LngLatBounds();
            markers.current.forEach(marker => {
              try {
                const lngLat = marker.getLngLat();
                bounds.extend([lngLat.lng, lngLat.lat]);
              } catch (e) {
                // Skip invalid marker
              }
            });
            
            // Add user location to bounds if available
            if (userLocation) {
              bounds.extend([userLocation.longitude, userLocation.latitude]);
            }

            // Only fit bounds if we have valid bounds
            const isEmpty = typeof (bounds as any).isEmpty === 'function' ? (bounds as any).isEmpty() : false;
            if (!isEmpty && markers.current.length > 0) {
              map.current.fitBounds(bounds, {
                padding: 50,
                maxZoom: 15,
                duration: 1000,
              });
            }
          } catch (error) {
            console.error('Error fitting bounds:', error);
          }
        }
      } catch (error) {
        console.error('Error updating markers:', error);
      }
    };

    // Check if map is loaded
    if (map.current && typeof map.current.loaded === 'function' && map.current.loaded()) {
      // Map is already loaded, update markers immediately
      updateMarkersWhenReady();
    } else if (map.current) {
      // Map exists but not loaded yet, wait for load event
      const loadHandler = () => {
        updateMarkersWhenReady();
      };
      map.current.once('load', loadHandler);
      return () => {
        if (map.current) {
          map.current.off('load', loadHandler);
        }
      };
    }
  }, [profiles, userLocation, mapboxgl]); // Removed onProfileClick from deps to prevent loops


  if (!config.mapbox.accessToken) {
    return (
      <div className="map-view-container map-error">
        <div className="map-error-message">
          <div>🗺️</div>
          <h3>Map Not Configured</h3>
          <p>Please add your Mapbox access token to the .env file</p>
          <p style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
            VITE_MAPBOX_ACCESS_TOKEN=your_token_here
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

  if (!mapboxgl) {
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
      <div ref={mapContainer} className="mapbox-map" />
      {selectedProfile && (
        <div className="map-profile-preview">
          <img src={selectedProfile.photo} alt={selectedProfile.name} className="preview-avatar" />
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
