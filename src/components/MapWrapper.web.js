import React from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Icons
const droneIcon = new L.DivIcon({
    html: '<div style="font-size: 30px;">🚁</div>',
    iconSize: [30, 30],
    className: 'drone-icon'
});

const destIcon = new L.DivIcon({
    html: '<div style="font-size: 30px;">📍</div>',
    iconSize: [30, 30],
    className: 'dest-icon'
});

const greenIcon = new L.DivIcon({
    html: '<div style="font-size: 30px;">✅</div>',
    iconSize: [30, 30],
    className: 'green-icon'
});

const grayIcon = new L.DivIcon({
    html: '<div style="font-size: 30px;">🔘</div>',
    iconSize: [30, 30],
    className: 'gray-icon'
});

// Center map when region changes
function MapEvents({ onMapClick, center }) {
    const map = useMap();

    React.useEffect(() => {
        if (center) {
            map.setView(center, map.getZoom());
        }
    }, [center]);

    if (onMapClick) {
        map.on('click', (e) => {
            onMapClick({ latitude: e.latlng.lat, longitude: e.latlng.lng });
        });
    }
    return null;
}

// MapView Wrapper
export const MapView = ({ children, region, style, initialRegion, showsUserLocation, onMapClick }) => {
    const center = region
        ? [region.latitude, region.longitude]
        : initialRegion
            ? [initialRegion.latitude, initialRegion.longitude]
            : [10.762622, 106.660172]; // Default HCM

    return (
        <div style={{ ...style, width: '100%', height: '100%' }}>
            <MapContainer
                center={center}
                zoom={14}
                style={{ width: '100%', height: '100%' }}
                scrollWheelZoom={true}
            >
                <MapEvents center={center} onMapClick={onMapClick} />
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {children}
            </MapContainer>
        </div>
    );
};

// Marker Wrapper
export const Marker_ = ({ coordinate, title, description, pinColor, children }) => {
    if (!coordinate || !coordinate.latitude) return null;

    let icon = undefined;
    if (pinColor === 'blue' || pinColor === 'DRONE') icon = droneIcon;
    else if (pinColor === 'red' || pinColor === 'DESTINATION') icon = destIcon;
    else if (pinColor === 'green') icon = greenIcon;
    else if (pinColor === 'gray') icon = grayIcon;

    return (
        <Marker position={[coordinate.latitude, coordinate.longitude]} icon={icon}>
            {(title || description) && (
                <Popup>
                    <strong>{title}</strong><br />
                    {description}
                </Popup>
            )}
            {children}
        </Marker>
    );
};

// Polyline Wrapper
export const Polyline_ = ({ coordinates, strokeColor, strokeWidth, lineDashPattern }) => {
    if (!coordinates || coordinates.length < 2) return null;
    const positions = coordinates.map(c => [c.latitude, c.longitude]);
    return <Polyline positions={positions} pathOptions={{ color: strokeColor || '#2196F3', weight: strokeWidth || 3 }} />;
};

// Animated Marker (just normal for web)
Marker_.Animated = Marker_;

export { Marker_ as Marker, Polyline_ as Polyline };
export const Callout = ({ children }) => <div>{children}</div>;
export default MapView;
