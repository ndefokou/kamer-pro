import { useEffect, useMemo, useRef, useState } from "react";
import { Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";

type Poi = {
  id: string;
  lat: number;
  lon: number;
  name: string;
  emoji: string;
  type: string;
};

const NearbyPOI = () => {
  const map = useMap();
  const [pois, setPois] = useState<Poi[]>([]);
  const timer = useRef<number | null>(null);
  const lastQueryKey = useRef<string>("");

  const emojiFor = useMemo(() => ({
    restaurant: "🍽️",
    cafe: "☕",
    fast_food: "🍔",
    bar: "🍺",
    pub: "🍻",
    pharmacy: "💊",
    hospital: "🏥",
    bank: "🏦",
    atm: "🏧",
    fuel: "⛽",
    school: "🏫",
    university: "🎓",
    library: "📚",
    supermarket: "🛒",
    mall: "🏬",
    department_store: "🏬",
    convenience: "🛍️",
    bakery: "🥖",
    fitness_centre: "🏋️",
    sports_centre: "🏟️",
    park: "🌳",
    hotel: "🏨",
    guest_house: "🏠",
    attraction: "🎯",
    station: "🚉",
    bus_stop: "🚏",
  } as const), []);

  const makeIcon = (emoji: string) =>
    L.divIcon({
      html: `<div style="background:white;border:1px solid #d1d5db;border-radius:12px;padding:2px 3px;font-size:14px;line-height:14px">${emoji}</div>`,
      className: "poi-div-icon",
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

  useEffect(() => {
    const run = () => {
      const zoom = map.getZoom();
      if (zoom < 12) {
        setPois([]);
        return;
      }
      const b = map.getBounds();
      const south = b.getSouth();
      const west = b.getWest();
      const north = b.getNorth();
      const east = b.getEast();
      const key = `${south.toFixed(4)},${west.toFixed(4)},${north.toFixed(4)},${east.toFixed(4)}:${zoom}`;
      if (key === lastQueryKey.current) return;
      lastQueryKey.current = key;

      const bbox = `${south},${west},${north},${east}`;
      const q = `
[out:json][timeout:25];
(
  node["amenity"~"restaurant|cafe|fast_food|bar|pub|pharmacy|hospital|bank|atm|fuel|school|university|library"](${bbox});
  node["shop"~"supermarket|mall|department_store|convenience|bakery"](${bbox});
  node["leisure"~"fitness_centre|sports_centre|park"](${bbox});
  node["tourism"~"hotel|guest_house|attraction"](${bbox});
  node["public_transport"="station"](${bbox});
  node["highway"="bus_stop"](${bbox});
);
out center 200;`;

      fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        body: q,
        headers: { "Content-Type": "text/plain;charset=UTF-8" },
      })
        .then((r) => r.json())
        .then((data) => {
          type OverpassNode = { type: string; id: number | string; lat?: number; lon?: number; tags?: Record<string, string> };
          const elements: OverpassNode[] = Array.isArray(data?.elements) ? (data.elements as OverpassNode[]) : [];
          const out: Poi[] = [];
          for (const el of elements) {
            if (el.type !== "node") continue;
            const tags: Record<string, string> = el.tags || {};
            const name: string = tags.name || "";
            const kind: string =
              tags.amenity ||
              tags.shop ||
              tags.leisure ||
              tags.tourism ||
              (tags.highway === "bus_stop" ? "bus_stop" : tags.public_transport === "station" ? "station" : "");
            if (!kind) continue;
            if (typeof el.lat !== 'number' || typeof el.lon !== 'number') continue;
            const base = (kind as string).toString();
            const k = (base in emojiFor ? base : base.split(";")[0]) as keyof typeof emojiFor;
            const emoji = (emojiFor as Record<string, string>)[k] || "📍";
            out.push({ id: String(el.id), lat: el.lat, lon: el.lon, name, emoji, type: base });
            if (out.length >= 200) break;
          }
          setPois(out);
        })
        .catch(() => {});
    };

    const onMove = () => {
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(run, 600) as unknown as number;
    };

    run();
    map.on("moveend", onMove);
    return () => {
      map.off("moveend", onMove);
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [map, emojiFor]);

  return (
    <>
      {pois.map((p) => (
        <Marker key={p.id} position={[p.lat, p.lon]} icon={makeIcon(p.emoji)}>
          <Popup>
            <div className="space-y-1">
              <div className="font-semibold text-sm">{p.name || p.type}</div>
              <div className="text-xs text-gray-600">{p.type}</div>
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
};

export default NearbyPOI;
