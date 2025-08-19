import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import type { LatLngTuple } from 'leaflet';

interface MapUpdaterProps {
  position: LatLngTuple;
}

const MapUpdater: React.FC<MapUpdaterProps> = ({ position }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(position, map.getZoom());
  }, [position, map]);
  return null;
};

export default MapUpdater;