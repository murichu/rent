import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Custom marker icons based on status
const createIcon = (status) => {
  const colors = {
    AVAILABLE: '#10b981',
    OCCUPIED: '#3b82f6',
    MAINTENANCE: '#ef4444',
    OFF_MARKET: '#6b7280',
  };

  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="background-color: ${colors[status]}; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
};

const PropertyMap = ({ properties = [], center = [40.7128, -74.006], zoom = 12 }) => {
  const [selectedProperty, setSelectedProperty] = useState(null);

  // Mock coordinates - In production, geocode addresses or store coordinates
  const propertiesWithCoords = properties.map((prop, index) => ({
    ...prop,
    lat: center[0] + (Math.random() - 0.5) * 0.1,
    lng: center[1] + (Math.random() - 0.5) * 0.1,
  }));

  return (
    <div className="h-full w-full rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
      <MapContainer
        center={center}
        zoom={zoom}
        className="h-full w-full"
        style={{ minHeight: '500px' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {propertiesWithCoords.map((property) => (
          <Marker
            key={property.id}
            position={[property.lat, property.lng]}
            icon={createIcon(property.status)}
            eventHandlers={{
              click: () => setSelectedProperty(property),
            }}
          >
            <Popup>
              <div className="min-w-[200px]">
                <h3 className="font-bold text-lg mb-1">{property.title}</h3>
                <p className="text-sm text-gray-600 mb-2">{property.address}</p>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg font-bold text-blue-600">
                    ${property.rentAmount?.toLocaleString()}/mo
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${property.status === 'AVAILABLE' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                    {property.status}
                  </span>
                </div>
                {property.bedrooms && property.bathrooms && (
                  <p className="text-sm text-gray-600">
                    {property.bedrooms} bed • {property.bathrooms} bath
                  </p>
                )}
                <button
                  onClick={() => window.open(`/properties/${property.id}`, '_blank')}
                  className="mt-3 w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  View Details
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default PropertyMap;
