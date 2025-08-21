import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Marker, GeoJSON } from 'react-leaflet';
import type { RestaurantApplication } from '../../types';

interface ApplicationDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  application: RestaurantApplication | null;
}

const ApplicationDetailsModal: React.FC<ApplicationDetailsModalProps> = ({ isOpen, onClose, application }) => {
  const geoJsonData = useMemo(() => {
    if (!application?.delivery_area_geojson) {
      return null;
    }
    try {
      return typeof application.delivery_area_geojson === 'string'
        ? JSON.parse(application.delivery_area_geojson)
        : application.delivery_area_geojson;
    } catch (e) {
      console.error("Failed to parse GeoJSON:", e);
      return null;
    }
  }, [application]);

  if (!application) return null;

  const location: [number, number] = [application.location_lat, application.location_lon];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  {application.logo_url && (
                    <img src={application.logo_url} alt="Logo" className="h-16 w-16 rounded-lg object-cover" />
                  )}
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{application.restaurant_name}</h2>
                    <p className="text-sm text-gray-600">بواسطة: {application.user_name} ({application.user_email})</p>
                  </div>
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600">&times;</button>
              </div>
              <hr className="my-4" />
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold">الوصف</h3>
                  <p className="text-gray-700">{application.description}</p>
                </div>
                <div>
                  <h3 className="font-semibold">العنوان</h3>
                  <p className="text-gray-700">{application.address}</p>
                </div>
                <div>
                  <h3 className="font-semibold">الموقع ومنطقة التوصيل</h3>
                  <div className="h-64 w-full mt-2 rounded-lg overflow-hidden">
                    <MapContainer center={location} zoom={13} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <Marker position={location} />
                      {geoJsonData && (
                        <GeoJSON data={geoJsonData} />
                      )}
                    </MapContainer>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ApplicationDetailsModal;