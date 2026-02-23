import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Alert, Animated, Easing, Platform, Text } from 'react-native';
import MapView, { Marker, Polyline } from '../components/MapWrapper';
import ControlPanel from '../components/ControlPanel';
import OrderManagement from '../components/OrderManagement';
import DroneManagement from '../components/DroneManagement';
import { generateFakeRoute } from '../data/mockData';

const DroneFlightScreen = () => {
    // State for Flow
    const [flightPhase, setFlightPhase] = useState('SELECT_ORDER');
    const [order, setOrder] = useState(null);
    const [drone, setDrone] = useState(null);

    // Modal State
    const [showOrderAdmin, setShowOrderAdmin] = useState(false);
    const [showDroneAdmin, setShowDroneAdmin] = useState(false);

    // Flight Logic State
    const [isFlying, setIsFlying] = useState(false);
    const [currentPositionIndex, setCurrentPositionIndex] = useState(0);
    const [route, setRoute] = useState([]);
    const mapRef = useRef(null);

    // Animation values for smooth movement
    const droneLat = useRef(new Animated.Value(10.7500)).current;
    const droneLng = useRef(new Animated.Value(106.6700)).current;

    // Initial Region
    const initialRegion = {
        latitude: 10.762622,
        longitude: 106.660172,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
    };

    const currentWaypoint = route[currentPositionIndex] || null;
    const flightProgress = route.length > 0 ? currentPositionIndex / (route.length - 1) : 0;

    // --- Handlers ---

    const handleSelectOrder = (selectedOrder) => {
        setOrder(selectedOrder);
        setFlightPhase('SELECT_DRONE');
        // Zoom Logic...
    };

    const handleSelectDrone = (selectedDrone) => {
        setDrone(selectedDrone);
        setFlightPhase('READY_TO_FLY');
        // Ensure drone starts at Hub
        droneLat.setValue(10.7500);
        droneLng.setValue(106.6700);
    };

    const handleBack = () => {
        if (flightPhase === 'SELECT_DRONE') {
            setFlightPhase('SELECT_ORDER');
            setOrder(null);
        } else if (flightPhase === 'READY_TO_FLY') {
            setFlightPhase('SELECT_DRONE');
            setDrone(null);
        }
    };

    const handleStartFlight = () => {
        if (!order || !drone) return;
        const startPoint = { lat: 10.7500, lng: 106.6700 }; // Hub
        const endPoint = order.destination;

        // Generate Outbound Route
        const waypoints = generateFakeRoute(startPoint, endPoint);
        setRoute(waypoints);
        setCurrentPositionIndex(0);
        setIsFlying(true);
        setFlightPhase('TAKEOFF'); // Start with Takeoff
    };

    const handleReturnToBase = () => {
        const startPoint = order.destination; // Current loc
        const endPoint = { lat: 10.7500, lng: 106.6700 }; // Hub

        const waypoints = generateFakeRoute(startPoint, endPoint);
        setRoute(waypoints);
        setCurrentPositionIndex(0);
        setIsFlying(true);
        setFlightPhase('RETURN_TAKEOFF');
    };

    const handleAbort = () => {
        if (!isFlying) return;

        const performAbort = () => {
            // Calculate path from CURRENT location to Hub
            const currentLoc = (route && route[currentPositionIndex]) ? route[currentPositionIndex] : { lat: 10.7500, lng: 106.6700 };
            const hubLoc = { lat: 10.7500, lng: 106.6700 };

            // Generate new return route from HERE to HUB
            const waypoints = generateFakeRoute(currentLoc, hubLoc);
            setRoute(waypoints);
            setCurrentPositionIndex(0);
            setFlightPhase('RETURNING');
        };

        if (Platform.OS === 'web') {
            // Web confirm
            if (confirm("Emergency: Return to base now?")) {
                performAbort();
            }
        } else {
            // Native Alert
            Alert.alert("Emergency Abort", "Drone returning to base immediately.", [
                { text: "Cancel", style: "cancel" },
                { text: "Return Now", onPress: performAbort }
            ]);
        }
    };

    const handleReset = () => {
        setFlightPhase('SELECT_ORDER');
        setOrder(null);
        setDrone(null);
        setRoute([]);
        setCurrentPositionIndex(0);
        droneLat.setValue(10.7500);
        droneLng.setValue(106.6700);
    };

    // --- Flight Loop with Sequenced Phases ---
    useEffect(() => {
        let interval;
        if (isFlying) {
            // Phase 1: Takeoff (Wait 3 seconds before moving)
            if (flightPhase === 'TAKEOFF' || flightPhase === 'RETURN_TAKEOFF') {
                const nextPhase = flightPhase === 'TAKEOFF' ? 'CRUISING' : 'RETURNING';
                const timer = setTimeout(() => {
                    setFlightPhase(nextPhase);
                }, 3000); // 3s Takeoff
                return () => clearTimeout(timer);
            }

            // Phase 3: Landing (Stop moving, Wait 3 seconds)
            if (flightPhase === 'LANDING' || flightPhase === 'RETURN_LANDING') {
                const nextPhase = flightPhase === 'LANDING' ? 'DELIVERED' : 'RETURNED';
                const timer = setTimeout(() => {
                    setIsFlying(false);
                    setFlightPhase(nextPhase);
                    if (nextPhase === 'DELIVERED') Alert.alert("Success", "Package Delivered!");
                    else Alert.alert("Mission Complete", "Drone returned safely.");
                }, 3000); // 3s Landing
                return () => clearTimeout(timer);
            }

            // Phase 2: Cruising (Move along waypoints)
            if (['CRUISING', 'RETURNING'].includes(flightPhase) && route.length > 0) {
                interval = setInterval(() => {
                    setCurrentPositionIndex((prevIndex) => {
                        const nextIndex = prevIndex + 1;

                        // Check if reached end of route
                        if (nextIndex >= route.length) {
                            clearInterval(interval);
                            // Instead of stopping, switch to Landing
                            if (flightPhase === 'CRUISING') setFlightPhase('LANDING');
                            else if (flightPhase === 'RETURNING') setFlightPhase('RETURN_LANDING');
                            return prevIndex;
                        }
                        return nextIndex;
                    });
                }, 1000);
            }
        }
        return () => clearInterval(interval);
    }, [isFlying, route, flightPhase]);

    // Animation Loop (Only during Cruising)
    useEffect(() => {
        if (isFlying && ['CRUISING', 'RETURNING'].includes(flightPhase) && route.length > 0 && currentPositionIndex < route.length) {
            const nextPoint = route[currentPositionIndex];
            Animated.parallel([
                Animated.timing(droneLat, {
                    toValue: nextPoint.lat,
                    duration: 1000,
                    useNativeDriver: false,
                    easing: Easing.linear,
                }),
                Animated.timing(droneLng, {
                    toValue: nextPoint.lng,
                    duration: 1000,
                    useNativeDriver: false,
                    easing: Easing.linear,
                }),
            ]).start();
        }
    }, [currentPositionIndex, isFlying, route, droneLat, droneLng, flightPhase]);

    return (
        <View style={styles.container}>
            {Platform.OS === 'web' ? (
                <View style={styles.webMapFallback}>
                    <Text style={styles.webMapText}>🗺️ Map View Not Available on Web</Text>
                    <Text style={styles.webMapSubText}>Status: {flightPhase}</Text>
                </View>
            ) : (
                <MapView
                    ref={mapRef}
                    style={styles.map}
                    initialRegion={initialRegion}
                >
                    {/* Markers & Lines */}
                    <Marker coordinate={{ latitude: 10.7500, longitude: 106.6700 }} title="Station A" pinColor="blue" />
                    {order && <Marker coordinate={{ latitude: order.destination.lat, longitude: order.destination.lng }} title={order.destination.name} pinColor="red" />}

                    {route.length > 0 && (
                        <Polyline
                            coordinates={route.map(p => ({ latitude: p.lat, longitude: p.lng }))}
                            strokeColor={['RETURNING', 'RETURN_TAKEOFF', 'RETURN_LANDING'].includes(flightPhase) ? "#FF9800" : "#2196F3"}
                            strokeWidth={3}
                        />
                    )}

                    {/* Drone Marker */}
                    {flightPhase !== 'SELECT_ORDER' && (
                        <Marker.Animated
                            coordinate={{ latitude: droneLat, longitude: droneLng }}
                            title="Drone"
                            anchor={{ x: 0.5, y: 0.5 }}
                        >
                            <View style={[styles.droneMarker, (flightPhase === 'TAKEOFF' || flightPhase === 'LANDING') && styles.hovering]}>
                                <Text style={{ fontSize: 40 }}>🚁</Text>
                            </View>
                        </Marker.Animated>
                    )}
                </MapView>
            )}

            <ControlPanel
                flightPhase={flightPhase}
                order={order}
                drone={drone}
                onSelectOrder={handleSelectOrder}
                onSelectDrone={handleSelectDrone}
                onStartFlight={handleStartFlight}
                onReturnToBase={handleReturnToBase}
                onReset={handleReset}
                onBack={handleBack}   // New
                onAbort={handleAbort} // New
                currentWaypoint={currentWaypoint}
                flightProgress={flightProgress}
                onManageOrders={() => setShowOrderAdmin(true)}
                onManageDrones={() => setShowDroneAdmin(true)}
            />

            <OrderManagement visible={showOrderAdmin} onClose={() => setShowOrderAdmin(false)} />
            <DroneManagement visible={showDroneAdmin} onClose={() => setShowDroneAdmin(false)} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    map: {
        width: '100%',
        height: '100%',
    },
    droneMarker: {
        width: 50,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    hovering: {
        transform: [{ scale: 1.2 }], // Visual cue for hover
    },
    webMapFallback: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8f8f8',
        paddingBottom: 250,
    },
    webMapText: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 10,
    },
    webMapSubText: {
        fontSize: 14,
        color: '#666',
    }
});

export default DroneFlightScreen;
