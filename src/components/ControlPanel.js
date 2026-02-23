import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, FlatList, Alert } from 'react-native';
import MetricsDisplay from './MetricsDisplay';
import { dataManager } from '../data/DataManager';

const ControlPanel = ({
    flightPhase,
    order,
    drone,
    onSelectOrder,
    onSelectDrone,
    onStartFlight,
    onReturnToBase,
    onReset,
    onBack,      // New Prop
    onAbort,     // New Prop
    currentWaypoint,
    flightProgress,
    onManageOrders,
    onManageDrones
}) => {
    const [orders, setOrders] = useState([]);
    const [drones, setDrones] = useState([]);

    useEffect(() => {
        const updateData = () => {
            setOrders([...dataManager.getOrders()]);
            setDrones([...dataManager.getDrones()]);
        };
        updateData();
        const unsubscribe = dataManager.subscribe(updateData);
        return unsubscribe;
    }, []);

    const isDroneCompatible = (droneItem) => {
        if (!order) return true;
        if (droneItem.maxPayload && droneItem.maxPayload < order.weight) return false;
        return true;
    };

    const handleDroneSelect = (item) => {
        if (!isDroneCompatible(item)) {
            Alert.alert("⚠️ Capacity Warning", `This drone can only carry ${item.maxPayload}kg. The order weighs ${order.weight}kg.`);
            return;
        }
        onSelectDrone(item);
    };

    // --- Helpers for Status Text ---
    const getStatusText = () => {
        switch (flightPhase) {
            case 'TAKEOFF': return "🛫 Taking Off...";
            case 'CRUISING': return `✈️ En Route to ${order?.destination.name}`;
            case 'LANDING': return "🛬 Landing...";
            case 'RETURNING': return "🏠 Returning to Base";
            case 'RETURN_TAKEOFF': return "🛫 Taking Off (Return)...";
            case 'RETURN_LANDING': return "🛬 Landing at Base...";
            default: return "Flying";
        }
    };

    // --- Render Functions ---

    const renderOrderList = () => (
        <View style={styles.listContainer}>
            <View style={styles.headerRow}>
                <Text style={styles.title}>Select an Order</Text>
                <TouchableOpacity style={styles.manageBtn} onPress={onManageOrders}>
                    <Text style={styles.manageText}>⚙️ Edit</Text>
                </TouchableOpacity>
            </View>
            <FlatList
                data={orders}
                keyExtractor={item => item.id}
                ListEmptyComponent={<Text style={styles.emptyText}>No orders available.</Text>}
                renderItem={({ item }) => (
                    <TouchableOpacity style={styles.listItem} onPress={() => onSelectOrder(item)}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={styles.itemTitle}>Order #{item.id}</Text>
                            <Text style={styles.weightTag}>⚖️ {item.weight} kg</Text>
                        </View>
                        <Text style={styles.itemDetail}>{item.destination.name}</Text>
                    </TouchableOpacity>
                )}
            />
        </View>
    );

    const renderDroneList = () => (
        <View style={styles.listContainer}>
            <View style={styles.headerRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {/* Back Button */}
                    <TouchableOpacity style={styles.backBtn} onPress={onBack}>
                        <Text style={styles.backText}>⬅️</Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>Select a Drone</Text>
                </View>
                <TouchableOpacity style={styles.manageBtn} onPress={onManageDrones}>
                    <Text style={styles.manageText}>⚙️ Edit</Text>
                </TouchableOpacity>
            </View>

            {order && (
                <View style={styles.contextBar}>
                    <Text style={styles.contextText}>Order: {order.destination.name} ({order.weight} kg)</Text>
                </View>
            )}

            <FlatList
                data={drones}
                keyExtractor={item => item.id}
                ListEmptyComponent={<Text style={styles.emptyText}>No drones available.</Text>}
                renderItem={({ item }) => {
                    const compatible = isDroneCompatible(item);
                    const isAvailable = item.status === 'Available';

                    return (
                        <TouchableOpacity
                            style={[styles.listItem, (!isAvailable || !compatible) && styles.disabledItem]}
                            onPress={() => isAvailable && handleDroneSelect(item)}
                        >
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text style={styles.itemTitle}>{item.model}</Text>
                                <Text style={{ color: item.status === 'Available' ? 'green' : 'orange' }}>{item.status}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', marginTop: 4 }}>
                                <Text style={[styles.itemDetail, !compatible && { color: 'red', fontWeight: 'bold' }]}>
                                    Max Load: {item.maxPayload || 0} kg
                                </Text>
                                <Text style={[styles.itemDetail, { marginLeft: 15 }]}>Bat: {item.battery}%</Text>
                            </View>
                        </TouchableOpacity>
                    );
                }}
            />
        </View>
    );

    const renderReadyToFly = () => (
        <View style={styles.centerContent}>
            <View style={{ width: '100%', alignItems: 'flex-start', marginBottom: 10 }}>
                <TouchableOpacity style={styles.backBtn} onPress={onBack}>
                    <Text style={styles.backText}>⬅️ Back to Drones</Text>
                </TouchableOpacity>
            </View>

            <Text style={styles.title}>Ready for Takeoff</Text>
            <View style={styles.summaryCard}>
                <Text style={styles.summaryText}>📦 Order: #{order?.id} ({order?.weight}kg)</Text>
                <Text style={styles.summaryText}>📍 Dest: {order?.destination.name}</Text>
                <Text style={styles.summaryText}>🚁 Drone: {drone?.model}</Text>
                <Text style={styles.summaryText}>✅ Pre-Flight Check: Passed</Text>
            </View>
            <TouchableOpacity style={styles.startButton} onPress={onStartFlight}>
                <Text style={styles.startButtonText}>🚀 INITIATE LAUNCH</Text>
            </TouchableOpacity>
        </View>
    );

    const renderFlying = () => (
        <View style={styles.flightContent}>
            <View style={styles.headerRow}>
                <Text style={styles.statusText}>{getStatusText()}</Text>
                <ActivityIndicator size="small" color="#4CAF50" />
            </View>

            <MetricsDisplay currentWaypoint={currentWaypoint} />

            <View style={styles.progressContainer}>
                <Text style={styles.progressLabel}>Flight Phase: {flightPhase}</Text>
                <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${flightProgress * 100}%` }]} />
                </View>
            </View>

            {/* Abort Button - Only show if not already landing/returned */}
            {['TAKEOFF', 'CRUISING'].includes(flightPhase) && (
                <TouchableOpacity style={styles.abortBtn} onPress={onAbort}>
                    <Text style={styles.abortText}>⚠️ EMERGENCY RETURN</Text>
                </TouchableOpacity>
            )}
        </View>
    );

    const renderDelivered = () => (
        <View style={styles.centerContent}>
            <Text style={styles.successTitle}>✅ Package Delivered</Text>
            <Text style={styles.subtitle}>Order #{order?.id} drop-off confirmed.</Text>
            <TouchableOpacity style={styles.returnButton} onPress={onReturnToBase}>
                <Text style={styles.startButtonText}>↩️ RETURN TO BASE</Text>
            </TouchableOpacity>
        </View>
    );

    const renderReturned = () => (
        <View style={styles.centerContent}>
            <Text style={styles.title}>🏠 Mission Complete</Text>
            <Text style={styles.subtitle}>Drone has returned safely.</Text>
            <TouchableOpacity style={styles.scanButton} onPress={onReset}>
                <Text style={styles.scanButtonText}>Process New Order</Text>
            </TouchableOpacity>
        </View>
    );

    const renderContent = () => {
        switch (flightPhase) {
            case 'SELECT_ORDER': return renderOrderList();
            case 'SELECT_DRONE': return renderDroneList();
            case 'READY_TO_FLY': return renderReadyToFly();
            case 'TAKEOFF':
            case 'CRUISING':
            case 'LANDING':
            case 'RETURNING':
            case 'RETURN_TAKEOFF':
            case 'RETURN_LANDING':
                return renderFlying();
            case 'DELIVERED': return renderDelivered();
            case 'RETURNED': return renderReturned();
            default: return renderOrderList();
        }
    };

    return (
        <View style={styles.container}>
            {renderContent()}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '45%',
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 10,
        padding: 20,
    },
    title: { fontSize: 22, fontWeight: 'bold', color: '#333' },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    backBtn: { marginRight: 10, padding: 5 },
    backText: { fontSize: 16, color: '#2196F3', fontWeight: 'bold' },
    manageBtn: { padding: 5 },
    manageText: { color: '#2196F3', fontWeight: 'bold' },
    contextBar: { backgroundColor: '#E3F2FD', padding: 8, borderRadius: 6, marginBottom: 10 },
    contextText: { color: '#1565C0', fontWeight: 'bold', textAlign: 'center' },
    listContainer: { flex: 1 },
    listItem: { backgroundColor: '#f8f9fa', padding: 15, borderRadius: 12, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: '#2196F3' },
    disabledItem: { opacity: 0.5, borderLeftColor: '#ccc' },
    itemTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    itemDetail: { fontSize: 14, color: '#666' },
    weightTag: { fontWeight: 'bold', color: '#333' },
    emptyText: { textAlign: 'center', marginTop: 20, color: '#999', fontStyle: 'italic' },
    centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    successTitle: { fontSize: 24, fontWeight: 'bold', color: '#4CAF50', marginBottom: 10, textAlign: 'center' },
    subtitle: { fontSize: 16, color: '#666', marginBottom: 20, textAlign: 'center' },
    summaryCard: { backgroundColor: '#FFF3E0', padding: 20, borderRadius: 12, width: '100%', marginBottom: 20 },
    summaryText: { fontSize: 16, marginBottom: 8, color: '#333' },
    startButton: { backgroundColor: '#4CAF50', paddingVertical: 15, borderRadius: 12, width: '100%', alignItems: 'center' },
    returnButton: { backgroundColor: '#2196F3', paddingVertical: 15, borderRadius: 12, width: '100%', alignItems: 'center' },
    scanButton: { backgroundColor: '#607D8B', paddingVertical: 15, borderRadius: 12, width: '100%', alignItems: 'center' },
    startButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    scanButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    flightContent: { flex: 1 },
    statusText: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    progressContainer: { marginTop: 15 },
    progressLabel: { fontSize: 12, color: '#666', marginBottom: 5 },
    progressBarBg: { height: 8, backgroundColor: '#e0e0e0', borderRadius: 4, overflow: 'hidden' },
    progressBarFill: { height: '100%', backgroundColor: '#4CAF50' },
    abortBtn: { marginTop: 15, backgroundColor: '#FFEBEE', padding: 10, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#FFCDD2' },
    abortText: { color: '#D32F2F', fontWeight: 'bold' }
});

export default ControlPanel;
