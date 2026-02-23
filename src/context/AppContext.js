import React, { createContext, useState, useContext, useEffect } from 'react';
import SocketService from '../services/SocketService';
import LocationService from '../services/LocationService';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
    const [deviceId, setDeviceId] = useState(null);
    const [role, setRole] = useState(null); // 'DRONE' | 'DESTINATION' | 'ADMIN'
    const [serverUrl, setServerUrl] = useState('https://doubt-heavily-guy-hull.trycloudflare.com');

    const [currentLocation, setCurrentLocation] = useState(null);
    const [isManualLocation, setIsManualLocation] = useState(false);

    const [activeDelivery, setActiveDelivery] = useState(null);
    const [activeDeliveries, setActiveDeliveries] = useState([]);
    const [deliveryStatus, setDeliveryStatus] = useState('idle');
    const [otherDeviceLocation, setOtherDeviceLocation] = useState(null);
    const [availableDevices, setAvailableDevices] = useState([]);

    useEffect(() => {
        if (!deviceId) return;

        const handleDeviceList = (list) => {
            setAvailableDevices(list);
        };

        const handleLocationUpdate = ({ id: devId, lat, lng }) => {
            setAvailableDevices(prev =>
                prev.map(d => d.id === devId ? { ...d, lat, lng } : d)
            );

            if (activeDelivery) {
                const partnerId = role === 'DRONE' ? activeDelivery.destId : activeDelivery.droneId;
                if (devId === partnerId) {
                    setOtherDeviceLocation({ latitude: lat, longitude: lng });
                }
            }
        };

        const handleStatusUpdate = (update) => {
            if (activeDelivery && activeDelivery.id === update.deliveryId) {
                setDeliveryStatus(update.status);
                setActiveDelivery(prev => ({ ...prev, status: update.status }));
            }
            setActiveDeliveries(prev =>
                prev.map(d => d.id === update.deliveryId ? { ...d, status: update.status } : d)
            );
        };

        const handleAssigned = (delivery) => {
            setActiveDelivery(delivery);
            setDeliveryStatus(delivery.status);
            setActiveDeliveries(prev => {
                const exists = prev.find(d => d.id === delivery.id);
                return exists ? prev.map(d => d.id === delivery.id ? delivery : d) : [...prev, delivery];
            });
        };

        const handleDeliveriesUpdate = (list) => {
            setActiveDeliveries(list);
            const mine = list.find(d => d.droneId === deviceId || d.destId === deviceId);
            if (mine) {
                setActiveDelivery(mine);
                setDeliveryStatus(mine.status);
            }
        };

        const handleCompleted = ({ deliveryId }) => {
            if (activeDelivery && activeDelivery.id === deliveryId) {
                setDeliveryStatus('DELIVERED');
                setActiveDelivery(null);
                setOtherDeviceLocation(null);
            }
            setActiveDeliveries(prev => prev.filter(d => d.id !== deliveryId));
        };

        SocketService.on('device_list', handleDeviceList);
        SocketService.on('device_location_update', handleLocationUpdate);
        SocketService.on('delivery_status_update', handleStatusUpdate);
        SocketService.on('delivery_assigned', handleAssigned);
        SocketService.on('active_deliveries_update', handleDeliveriesUpdate);
        SocketService.on('delivery_completed', handleCompleted);

        return () => {
            SocketService.off('device_list');
            SocketService.off('device_location_update');
            SocketService.off('delivery_status_update');
            SocketService.off('delivery_assigned');
            SocketService.off('active_deliveries_update');
            SocketService.off('delivery_completed');
        };
    }, [deviceId, activeDelivery, role]);

    const connectToServer = (id, selectedRole, url) => {
        setDeviceId(id);
        setRole(selectedRole);
        setServerUrl(url);

        SocketService.connect(url);

        SocketService.on('current_delivery', (delivery) => {
            if (delivery) {
                setActiveDelivery(delivery);
                setDeliveryStatus(delivery.status);
            }
        });

        SocketService.join(id, selectedRole);

        if (selectedRole !== 'ADMIN') {
            startLocationTracking();
        }
    };

    const startLocationTracking = async () => {
        const hasPermission = await LocationService.requestPermissions();
        if (hasPermission) {
            // Get initial location immediately
            const initialLoc = await LocationService.getCurrentLocation();
            if (initialLoc) {
                console.log("Initial Location:", initialLoc);
                setCurrentLocation(prev => {
                    if (!isManualLocation) {
                        SocketService.updateLocation(initialLoc.latitude, initialLoc.longitude);
                        return initialLoc;
                    }
                    return prev;
                });
            }

            // Then start watching
            LocationService.watchLocation((location) => {
                setCurrentLocation(prev => {
                    if (!isManualLocation) {
                        SocketService.updateLocation(location.latitude, location.longitude);
                        return location;
                    }
                    return prev;
                });
            });
        }
    };

    const setManualLocation = (lat, lng) => {
        setIsManualLocation(true);
        const newLoc = { latitude: lat, longitude: lng };
        setCurrentLocation(newLoc);
        SocketService.updateLocation(lat, lng);
    };

    const createDelivery = (droneId, destId, items = 'Package', quantity = 1, notes = '') => {
        SocketService.createDelivery(droneId, destId, items, quantity, notes);
    };

    const confirmDelivery = (code) => {
        if (activeDelivery) {
            SocketService.confirmDelivery(activeDelivery.id, code);
        }
    };

    return (
        <AppContext.Provider
            value={{
                deviceId,
                role,
                isConnected: !!deviceId,
                serverUrl,
                connectToServer,
                currentLocation,
                otherDeviceLocation,
                availableDevices,
                activeDelivery,
                activeDeliveries,
                deliveryStatus,
                createDelivery,
                confirmDelivery,
                setManualLocation,
                isManualLocation,
                setIsManualLocation
            }}
        >
            {children}
        </AppContext.Provider>
    );
};

export const useAppContext = () => useContext(AppContext);
