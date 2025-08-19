import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Polygon, useMapEvents } from 'react-leaflet';
import type { LatLngTuple } from 'leaflet';
import MapUpdater from './MapUpdater'; // استيراد المكون الجديد

interface LocationPickerMapProps {
  mode: 'location' | 'delivery_area';
  initialLocation?: LatLngTuple | null;
  initialArea?: LatLngTuple[];
  onLocationChange?: (location: LatLngTuple) => void;
  onAreaChange?: (area: LatLngTuple[]) => void;
}

const MapEventsHandler: React.FC<{
  mode: 'location' | 'delivery_area';
  setLocation: (pos: LatLngTuple) => void;
  setAreaPoints: React.Dispatch<React.SetStateAction<LatLngTuple[]>>;
}> = ({ mode, setLocation, setAreaPoints }) => {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      if (mode === 'location') {
        setLocation([lat, lng]);
      } else {
        setAreaPoints(points => [...points, [lat, lng]]);
      }
    },
  });
  return null;
};

const LocationPickerMap: React.FC<LocationPickerMapProps> = ({
  mode,
  initialLocation,
  initialArea,
  onLocationChange,
  onAreaChange,
}) => {
  const [location, setLocation] = useState<LatLngTuple | null>(initialLocation || null);
  const [areaPoints, setAreaPoints] = useState<LatLngTuple[]>(initialArea || []);

  useEffect(() => {
    if (location && onLocationChange) {
      onLocationChange(location);
    }
  }, [location, onLocationChange]);

  useEffect(() => {
    if (onAreaChange) {
      onAreaChange(areaPoints);
    }
  }, [areaPoints, onAreaChange]);

  const mapCenter = useMemo<LatLngTuple>(() => {
    return initialLocation || [33.5138, 36.2765]; // Default to Damascus
  }, [initialLocation]);

  return (
    <div className="h-96 w-full rounded-lg overflow-hidden relative">
      <MapContainer center={mapCenter} zoom={13} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapEventsHandler mode={mode} setLocation={setLocation} setAreaPoints={setAreaPoints} />
        {mode === 'location' && location && <Marker position={location} />}
        {mode === 'delivery_area' && areaPoints.length > 0 && <Polygon positions={areaPoints} />}
        {/* إضافة المكون الجديد لتحديث الخريطة */}
        {location && <MapUpdater position={location} />}
      </MapContainer>
      {mode === 'delivery_area' && (
        <div className="absolute bottom-2 right-2 z-[1000] flex gap-2">
            <button type="button" onClick={() => setAreaPoints([])} className="bg-red-500 text-white px-3 py-1 rounded shadow">مسح المنطقة</button>
            <button type="button" onClick={() => setAreaPoints(p => p.slice(0, -1))} className="bg-yellow-500 text-white px-3 py-1 rounded shadow">تراجع</button>
        </div>
      )}
    </div>
  );
};

export default LocationPickerMap;