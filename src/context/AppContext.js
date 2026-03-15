import React, { createContext, useState, useContext, useEffect, useRef, useCallback } from 'react';
import SocketService from '../services/SocketService';
import LocationService from '../services/LocationService';
import MQTTService from '../services/MQTTService';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
    const [deviceId, setDeviceId] = useState(null);
    const [role, setRole] = useState(null); // 'DRONE' | 'DESTINATION' | 'ADMIN'
    const [serverUrl, setServerUrl] = useState('http://localhost:3000');

    const [currentLocation, setCurrentLocation] = useState(null);
    const [isManualLocation, setIsManualLocation] = useState(false);

    const [activeDelivery, setActiveDelivery] = useState(null);
    const [activeDeliveries, setActiveDeliveries] = useState([]);
    const [completedDeliveries, setCompletedDeliveries] = useState([]);
    const [deliveryStatus, setDeliveryStatus] = useState('idle');
    const [otherDeviceLocation, setOtherDeviceLocation] = useState(null);
    const [availableDevices, setAvailableDevices] = useState([]);
    const [droneStatuses, setDroneStatuses] = useState({});
    const telemetryIntervalRef = useRef(null);

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
                if (update.status === 'CANCELED') {
                    setActiveDelivery(null);
                    setDeliveryStatus('idle');
                    setOtherDeviceLocation(null);
                } else {
                    setDeliveryStatus(update.status);
                    setActiveDelivery(prev => ({ ...prev, status: update.status }));
                }
            }
            setActiveDeliveries(prev =>
                update.status === 'CANCELED'
                    ? prev.filter(d => d.id !== update.deliveryId)
                    : prev.map(d => d.id === update.deliveryId ? { ...d, status: update.status } : d)
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
            } else {
                setActiveDelivery(null);
                setDeliveryStatus('idle');
                setOtherDeviceLocation(null);
            }
        };

        const handleCompleted = ({ deliveryId }) => {
            if (activeDelivery && activeDelivery.id === deliveryId) {
                MQTTService.stopMotor(); // Dừng motor khi giao hàng xong
                setDeliveryStatus('DELIVERED');
                setActiveDelivery(null);
                setOtherDeviceLocation(null);
            }
            setActiveDeliveries(prev => {
                const completedTask = prev.find(d => d.id === deliveryId);
                if (completedTask) {
                    setCompletedDeliveries(old => [
                        { ...completedTask, status: 'COMPLETED', completedAt: new Date().toISOString() },
                        ...old
                    ]);
                }
                return prev.filter(d => d.id !== deliveryId);
            });
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

    // --- MQTT TELEMETRY ---
    useEffect(() => {
        if (deviceId) {
            MQTTService.connect((data) => {
                if (data.type === 'TELEMETRY') {
                    const droneData = data.data;
                    setDroneStatuses(prev => ({
                        ...prev,
                        [droneData.id || 'Drone-01']: {
                            ...droneData,
                            lastSeen: Date.now()
                        }
                    }));

                    // Trick UI to show Drone on map
                    setAvailableDevices(prev => {
                        const existingInfo = prev.find(d => d.id === (droneData.id || 'Drone-01'));
                        if (existingInfo) {
                            return prev.map(d => d.id === (droneData.id || 'Drone-01')
                                ? { ...d, lat: droneData.lat, lng: droneData.lng }
                                : d);
                        } else {
                            return [...prev, {
                                id: droneData.id || 'Drone-01',
                                role: 'DRONE',
                                lat: droneData.lat,
                                lng: droneData.lng
                            }];
                        }
                    });
                }
            });
        }
        return () => MQTTService.disconnect();
    }, [deviceId]);

    // Polling fallback
    const pollDroneTelemetry = useCallback(async (url) => {
        try {
            const res = await fetch(`${url}/api/drones/telemetry`);
            if (res.ok) {
                const data = await res.json();
                setDroneStatuses(data);
            }
        } catch (err) { }
    }, []);

    useEffect(() => {
        if (deviceId && serverUrl) {
            pollDroneTelemetry(serverUrl);
            telemetryIntervalRef.current = setInterval(() => {
                pollDroneTelemetry(serverUrl);
            }, 3000);
        }
        return () => clearInterval(telemetryIntervalRef.current);
    }, [deviceId, serverUrl, pollDroneTelemetry]);

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

    const sendMission = async (lat, lon, alt = 20, arm = false, throttle = 10) => {
        try {
            console.log(`[MISSION] Sending via MQTT: Lat=${lat}, Lon=${lon}, Throttle=${throttle}%`);
            MQTTService.sendMission(lat, lon, throttle);

            const response = await fetch(`${serverUrl}/mission`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lat, lon, alt, arm, throttle }),
            });
            return true;
        } catch (error) {
            console.error('Error sending mission:', error);
            return true;
        }
    };

    const cancelDelivery = async (deliveryId) => {
        // Gửi lệnh stop_motor qua MQTT ngay lập tức để ngắt quyền điều khiển motor
        MQTTService.stopMotor();
        // Gọi lên server để hủy đơn hàng (hoặc tự xử lý local nếu chưa có backend)
        try {
            await fetch(`${serverUrl}/delivery/${deliveryId}/cancel`, { method: 'POST' });
        } catch (e) { console.error(e); }

        // Cập nhật UI ngay lập tức
        if (activeDelivery && activeDelivery.id === deliveryId) {
            setDeliveryStatus('idle'); // Sửa lại 'idle' để sạch view, thay vì 'CANCELED'
            setActiveDelivery(null);
            setOtherDeviceLocation(null);
        }
        setActiveDeliveries(prev => prev.filter(d => d.id !== deliveryId));
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
                completedDeliveries,
                deliveryStatus,
                createDelivery,
                confirmDelivery,
                cancelDelivery,
                sendMission,
                setManualLocation,
                isManualLocation,
                setIsManualLocation,
                droneStatuses
            }}
        >
            {children}
        </AppContext.Provider>
    );
};

export const useAppContext = () => useContext(AppContext);
