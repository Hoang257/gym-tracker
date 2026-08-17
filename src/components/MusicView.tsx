import { useState } from 'react';
import { uuid } from '../lib/storage';

// Лаунчер, не плеер: тап открывает родное приложение сервиса (deep link по https).
const SERVICES = [
  { name: 'Spotify', url: 'https://open.spotify.com', color: '#1DB954' },
  { name: 'Яндекс Музыка', url: 'https://music.yandex.ru', color: '#FFCC00' },
  { name: 'Звук', url: 'https://zvuk.com', color: '#B02DE9' },
  { name: 'YouTube Music', url: 'https://music.youtube.com', color: '#FF0000' },
];

const KEY = 'gt_music_playlists';
interface Playlist {
  id: string;
  name: string;
  url: string;
}

function load(): Playlist[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function persist(p: Playlist[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // хранилище недоступно — не критично
  }
}

export function MusicView() {
  const [playlists, setPlaylists] = useState<Playlist[]>(load);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [err, setErr] = useState('');

  const add = () => {
    const u = url.trim();
    if (!/^https?:\/\//i.test(u)) {
      setErr('Вставь ссылку, начинающуюся с https://');
      return;
    }
    const next = [...playlists, { id: uuid(), name: name.trim() || 'Плейлист', url: u }];
    setPlaylists(next);
    persist(next);
    setName('');
    setUrl('');
    setErr('');
  };

  const remove = (id: string) => {
    const next = playlists.filter((p) => p.id !== id);
    setPlaylists(next);
    persist(next);
  };

  return (
    <div className="list">
      <p className="music-tip">Музыка играет в фоне, когда дневник свёрнут. Трек можно переключать со шторки телефона, не заходя сюда.</p>

      <div className="section-label">Открыть сервис</div>
      <div className="music-grid">
        {SERVICES.map((s) => (
          <a
            key={s.name}
            className="music-tile"
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ ['--mc' as string]: s.color }}
          >
            <span className="music-dot" />
            {s.name}
          </a>
        ))}
      </div>

      <div className="section-label">Мои плейлисты для зала</div>
      {playlists.length === 0 ? (
        <div className="empty">Сохрани ссылку на плейлист, чтобы одним тапом попадать сразу в нужный.</div>
      ) : (
        <div className="music-pl-list">
          {playlists.map((p) => (
            <div className="music-pl" key={p.id}>
              <a className="music-pl-open" href={p.url} target="_blank" rel="noopener noreferrer">
                ▶ {p.name}
              </a>
              <button className="music-pl-del" onClick={() => remove(p.id)} aria-label={`Удалить плейлист ${p.name}`}>
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="music-add">
        <input
          className="music-input"
          placeholder="Название"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="music-input"
          placeholder="Ссылка на плейлист (https://...)"
          value={url}
          inputMode="url"
          onChange={(e) => {
            setUrl(e.target.value);
            if (err) setErr('');
          }}
        />
        {err && <span className="music-err">{err}</span>}
        <button className="body-btn music-add-btn" onClick={add}>
          Добавить плейлист
        </button>
      </div>
    </div>
  );
}
