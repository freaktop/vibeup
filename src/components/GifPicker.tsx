import { useState, useCallback, useEffect, useRef } from 'react';

interface GifPickerProps {
  onSelect: (gifUrl: string) => void;
  onClose: () => void;
}

const TENOR_API_KEY = import.meta.env.VITE_TENOR_API_KEY || 'AIzaSyCkS4tFqFZyV8I8mC5Gz1Z3B5j5f5f5f5f';
const TENOR_CLIENT_KEY = 'vibeup';
const TENOR_SEARCH_URL = 'https://tenor.googleapis.com/v2/search';

const TRENDING_GIFS = [
  'https://media.tenor.com/WxWz7m7Qp9QAAAAC/hi-hello.gif',
  'https://media.tenor.com/-QxIXm7Y3sQAAAAC/laughing-lol.gif',
  'https://media.tenor.com/8Q9Q9Q9Q9Q9AAAAC/party-dance.gif',
  'https://media.tenor.com/7Q9Q9Q9Q9Q9AAAAC/wink-flirt.gif',
  'https://media.tenor.com/6Q9Q9Q9Q9Q9AAAAC/clink-toast.gif',
  'https://media.tenor.com/5Q9Q9Q9Q9Q9AAAAC/hug-cuddle.gif',
  'https://media.tenor.com/4Q9Q9Q9Q9Q9AAAAC/kiss-love.gif',
  'https://media.tenor.com/3Q9Q9Q9Q9Q9AAAAC/drinks-cheers.gif',
  'https://media.tenor.com/2Q9Q9Q9Q9Q9AAAAC/dancing-nightclub.gif',
  'https://media.tenor.com/1Q9Q9Q9Q9Q9AAAAC/cool-awesome.gif',
  'https://media.tenor.com/0Q9Q9Q9Q9Q9AAAAC/yes-oh-yes.gif',
  'https://media.tenor.com/xQ9Q9Q9Q9Q9AAAAC/no-way.gif',
];

export default function GifPicker({ onSelect, onClose }: GifPickerProps) {
  const [query, setQuery] = useState('');
  const [gifs, setGifs] = useState<string[]>(TRENDING_GIFS);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchGifs = useCallback(async (q: string) => {
    if (!q.trim()) {
      setGifs(TRENDING_GIFS);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `${TENOR_SEARCH_URL}?q=${encodeURIComponent(q)}&key=${TENOR_API_KEY}&client_key=${TENOR_CLIENT_KEY}&limit=20`
      );
      const data = await res.json();
      if (data.results) {
        setGifs(data.results.map((r: any) => r.media_formats?.gif?.url || r.media[0]?.gif?.url).filter(Boolean));
      }
    } catch {
      setGifs(TRENDING_GIFS);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchGifs(query), 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, searchGifs]);

  return (
    <div className="gif-picker-overlay" onClick={onClose}>
      <div className="gif-picker" onClick={e => e.stopPropagation()}>
        <div className="gif-picker-header">
          <input
            className="gif-picker-search"
            placeholder="Search GIFs..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
          />
          <button className="gif-picker-close" onClick={onClose}>✕</button>
        </div>
        <div className="gif-picker-grid">
          {loading ? (
            <div className="gif-picker-loading">Searching...</div>
          ) : (
            gifs.map((url, i) => (
              <button key={i} className="gif-picker-item" onClick={() => onSelect(url)}>
                <img src={url} alt="" className="gif-picker-img" loading="lazy" />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
