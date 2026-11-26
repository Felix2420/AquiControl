import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { LocateFixed, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface Punto {
  lat: number;
  lng: number;
}
export interface Marcador extends Punto {
  etiqueta: string;
  tipo: "granja" | "estanque";
}

// Sin conexión los mosaicos no cargan, pero la página sigue funcionando (el mapa queda gris).
const CALLES = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const SATELITE = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const CENTRO_POR_DEFECTO: Punto = { lat: 24.8, lng: -107.4 }; // Sinaloa
const redondear = (n: number) => Math.round(n * 1e6) / 1e6;

const icono = (tipo: Marcador["tipo"]) =>
  L.divIcon({ className: "", html: `<span class="pin pin-${tipo}"></span>`, iconSize: [22, 22], iconAnchor: [11, 22] });

interface Props {
  /** Punto elegido (modo selección). */
  valor?: Punto | null;
  /** Si se pasa, el mapa permite elegir un punto con un clic o arrastrando el marcador. */
  onChange?: (p: Punto | null) => void;
  /** Puntos de solo lectura (granja y estanques). */
  marcadores?: Marcador[];
  /** Hacia dónde centrar cuando todavía no hay punto elegido. */
  centro?: Punto | null;
  className?: string;
  etiqueta: string;
}

export function MapaUbicacion({ valor, onChange, marcadores, centro, className, etiqueta }: Props) {
  const contenedor = useRef<HTMLDivElement>(null);
  const mapa = useRef<L.Map | null>(null);
  const capaPuntos = useRef<L.LayerGroup | null>(null);
  const pin = useRef<L.Marker | null>(null);
  const alCambiar = useRef(onChange);
  alCambiar.current = onChange;
  const [errorGps, setErrorGps] = useState<string | null>(null);
  const editable = !!onChange;

  // Crear el mapa una sola vez.
  useEffect(() => {
    if (!contenedor.current) return;
    const m = L.map(contenedor.current, { scrollWheelZoom: false }).setView(
      [(valor ?? centro ?? CENTRO_POR_DEFECTO).lat, (valor ?? centro ?? CENTRO_POR_DEFECTO).lng],
      valor || centro ? 14 : 6,
    );
    const calles = L.tileLayer(CALLES, { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(m);
    const satelite = L.tileLayer(SATELITE, { maxZoom: 18, attribution: "Imágenes © Esri" });
    L.control.layers({ Calles: calles, Satélite: satelite }, undefined, { position: "topright" }).addTo(m);
    capaPuntos.current = L.layerGroup().addTo(m);
    m.on("click", (e: L.LeafletMouseEvent) => alCambiar.current?.({ lat: redondear(e.latlng.lat), lng: redondear(e.latlng.lng) }));
    m.once("focus", () => m.scrollWheelZoom.enable());
    mapa.current = m;
    // El contenedor puede montarse oculto o con ancho 0: recalcular el tamaño tras pintar.
    const t = setTimeout(() => m.invalidateSize(), 150);
    return () => {
      clearTimeout(t);
      m.remove();
      mapa.current = null;
      pin.current = null;
    };
  }, []);

  // Marcador elegido (modo selección).
  useEffect(() => {
    const m = mapa.current;
    if (!m) return;
    if (!valor) {
      pin.current?.remove();
      pin.current = null;
      return;
    }
    if (!pin.current) {
      pin.current = L.marker([valor.lat, valor.lng], { icon: icono("granja"), draggable: editable }).addTo(m);
      pin.current.on("dragend", () => {
        const p = pin.current!.getLatLng();
        alCambiar.current?.({ lat: redondear(p.lat), lng: redondear(p.lng) });
      });
    } else {
      pin.current.setLatLng([valor.lat, valor.lng]);
    }
    if (!m.getBounds().contains([valor.lat, valor.lng])) m.setView([valor.lat, valor.lng], Math.max(m.getZoom(), 14));
  }, [valor?.lat, valor?.lng, editable]);

  // Marcadores de solo lectura: ajusta la vista para que se vean todos.
  const clave = JSON.stringify(marcadores ?? []);
  useEffect(() => {
    const m = mapa.current;
    const capa = capaPuntos.current;
    if (!m || !capa) return;
    capa.clearLayers();
    const lista = marcadores ?? [];
    for (const p of lista) {
      L.marker([p.lat, p.lng], { icon: icono(p.tipo) })
        .bindTooltip(p.etiqueta, { permanent: p.tipo === "estanque", direction: "top", offset: [0, -22] })
        .addTo(capa);
    }
    if (lista.length > 1) m.fitBounds(L.latLngBounds(lista.map((p) => [p.lat, p.lng] as [number, number])), { padding: [40, 40], maxZoom: 17 });
    else if (lista.length === 1) m.setView([lista[0]!.lat, lista[0]!.lng], 15);
  }, [clave]);

  // Si cambia el centro sugerido y aún no hay punto, mover la vista.
  useEffect(() => {
    if (mapa.current && !valor && centro) mapa.current.setView([centro.lat, centro.lng], 14);
  }, [centro?.lat, centro?.lng]);

  const usarMiUbicacion = () => {
    setErrorGps(null);
    if (!navigator.geolocation) return setErrorGps("Tu navegador no permite obtener la ubicación.");
    navigator.geolocation.getCurrentPosition(
      (pos) => onChange?.({ lat: redondear(pos.coords.latitude), lng: redondear(pos.coords.longitude) }),
      () => setErrorGps("No se pudo obtener tu ubicación. Haz clic en el mapa para elegirla."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <div>
      <div
        ref={contenedor}
        role="application"
        aria-label={etiqueta}
        className={cn("mapa isolate h-64 w-full overflow-hidden rounded-[8px] shadow-[var(--hairline)]", className)}
      />
      {editable && (
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted">
          <span className="num">{valor ? `${valor.lat.toFixed(5)}, ${valor.lng.toFixed(5)}` : "Haz clic en el mapa para marcar el lugar."}</span>
          <button type="button" className="inline-flex items-center gap-1 hover:text-paper" onClick={usarMiUbicacion}>
            <LocateFixed className="h-4 w-4" aria-hidden="true" />
            Usar mi ubicación
          </button>
          {valor && (
            <button type="button" className="inline-flex items-center gap-1 hover:text-danger" onClick={() => onChange?.(null)}>
              <X className="h-4 w-4" aria-hidden="true" />
              Quitar
            </button>
          )}
          {valor && (
            <a className="hover:text-paper" href={`https://www.google.com/maps?q=${valor.lat},${valor.lng}`} target="_blank" rel="noreferrer">
              Abrir en Google Maps
            </a>
          )}
        </div>
      )}
      {errorGps && <p className="mt-1 text-[13px] text-danger">{errorGps}</p>}
    </div>
  );
}
