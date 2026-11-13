import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { api } from '../api';

export function LiveMapPage() {
  const ref = useRef<HTMLDivElement>(null);
  const cases = useQuery({ queryKey: ['cases'], queryFn: () => api.cases() });

  useEffect(() => {
    if (!ref.current) return;
    const map = new maplibregl.Map({
      container: ref.current,
      style: 'https://demotiles.maplibre.org/style.json',
      center: [81.7795, 16.9846],
      zoom: 13,
    });
    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    const markers: maplibregl.Marker[] = [];
    cases.data?.forEach((c) => {
      if (!c.lastSeen) return;
      const el = document.createElement('div');
      el.style.width = '14px';
      el.style.height = '14px';
      el.style.borderRadius = '50%';
      el.style.background = c.status === 'MISSING' ? '#B42318' : '#E8A33D';
      el.style.border = '2px solid #fff';
      markers.push(
        new maplibregl.Marker({ element: el })
          .setLngLat([c.lastSeen.lng, c.lastSeen.lat])
          .setPopup(new maplibregl.Popup().setText(`${c.memberUid} · ${c.status}`))
          .addTo(map),
      );
    });

    return () => {
      markers.forEach((m) => m.remove());
      map.remove();
    };
  }, [cases.data]);

  return (
    <main className="main" style={{ gridColumn: '2 / -1' }}>
      <div className="topbar">
        <div>
          <h2>Live map</h2>
          <p className="muted">Rajamahendravaram · Kotilingala Ghat area</p>
        </div>
      </div>
      <div ref={ref} style={{ height: '70vh', borderRadius: 12, overflow: 'hidden' }} />
    </main>
  );
}
