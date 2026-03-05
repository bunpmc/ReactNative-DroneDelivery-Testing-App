import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Platform, TextInput, Modal, ScrollView, Dimensions } from 'react-native';
import MapView, { Marker } from '../components/MapWrapper';
import { useAppContext } from '../context/AppContext';

const HomeScreen = ({ navigation }) => {
    const {
        deviceId, role, currentLocation,
        activeDelivery, activeDeliveries, completedDeliveries, deliveryStatus,
        availableDevices, createDelivery,
        setManualLocation, isManualLocation, setIsManualLocation
    } = useAppContext();

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedDrone, setSelectedDrone] = useState(null);
    const [selectedDest, setSelectedDest] = useState(null);
    const [items, setItems] = useState('');
    const [quantity, setQuantity] = useState('1');
    const [notes, setNotes] = useState('');
    const [showMap, setShowMap] = useState(false);
    const [lastAlertedStatus, setLastAlertedStatus] = useState(null);

    useEffect(() => {
        if (activeDelivery && role === 'DRONE') {
            navigation.navigate('Delivery');
        }
    }, [activeDelivery, role]);

    useEffect(() => {
        if (role === 'DESTINATION' && deliveryStatus && deliveryStatus !== lastAlertedStatus) {
            let message = null;
            if (deliveryStatus === 'APPROACHING') message = '🚁 Drone đang đến gần! (< 500 m)';
            else if (deliveryStatus === 'ARRIVED') message = '📍 Drone đã đến! Hãy chuẩn bị nhận hàng.';
            else if (deliveryStatus === 'DELIVERED') message = '✅ Giao hàng hoàn tất!';

            if (message) {
                if (Platform.OS === 'web') window.alert(message);
                else Alert.alert('Thông báo', message);
                setLastAlertedStatus(deliveryStatus);
            }
        }
    }, [deliveryStatus, role, lastAlertedStatus]);

    const drones = availableDevices.filter(d => d.role === 'DRONE');
    const destinations = availableDevices.filter(d => d.role === 'DESTINATION');

    const handleCreateTask = () => {
        if (!selectedDrone || !selectedDest) {
            const msg = 'Vui lòng chọn cả Drone và Điểm đến';
            Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Lỗi', msg);
            return;
        }
        if (!items.trim()) {
            const msg = 'Vui lòng nhập thông tin hàng hóa';
            Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Lỗi', msg);
            return;
        }

        createDelivery(selectedDrone, selectedDest, items, parseInt(quantity) || 1, notes);
        setShowCreateModal(false);
        resetForm();
    };

    const resetForm = () => {
        setSelectedDrone(null);
        setSelectedDest(null);
        setItems('');
        setQuantity('1');
        setNotes('');
    };

    const handleMapClick = (coord) => {
        if (Platform.OS === 'web' && (role === 'DRONE' || role === 'DESTINATION')) {
            setManualLocation(coord.latitude, coord.longitude);
        }
    };

    // ===================== DESTINATION VIEW =====================
    if (role === 'DESTINATION') {
        return (
            <ScrollView style={styles.destContainer}>
                <View style={styles.destHeader}>
                    <Text style={styles.destTitle}>📍 Điểm nhận hàng</Text>
                    <Text style={styles.destId}>ID: {deviceId}</Text>
                    <TouchableOpacity
                        style={styles.mapToggleButton}
                        onPress={() => setShowMap(!showMap)}
                    >
                        <Text style={styles.mapToggleText}>{showMap ? '🙈 Ẩn bản đồ' : '🗺️ Hiện bản đồ'}</Text>
                    </TouchableOpacity>
                </View>

                {showMap && (
                    <View style={styles.destMapContainer}>
                        <MapView
                            style={styles.destMap}
                            showsUserLocation={true}
                            onMapClick={handleMapClick}
                            region={currentLocation ? {
                                latitude: currentLocation.latitude,
                                longitude: currentLocation.longitude,
                                latitudeDelta: 0.01,
                                longitudeDelta: 0.01,
                            } : {
                                latitude: 10.762622,
                                longitude: 106.660172,
                                latitudeDelta: 0.01,
                                longitudeDelta: 0.01,
                            }}
                        >
                            {currentLocation && (
                                <Marker
                                    coordinate={currentLocation}
                                    title="Vị trí của bạn"
                                    pinColor="green"
                                />
                            )}
                            {availableDevices.map(d => {
                                if (d.id === deviceId || !d.lat) return null;
                                return (
                                    <Marker
                                        key={d.id}
                                        coordinate={{ latitude: d.lat, longitude: d.lng }}
                                        title={d.id}
                                        description={d.role}
                                        pinColor={d.role === 'DRONE' ? 'blue' : 'gray'}
                                    />
                                );
                            })}
                        </MapView>
                        {Platform.OS === 'web' && (
                            <View style={styles.mapHint}>
                                <Text style={styles.mapHintText}>💡 Click để dời vị trí nếu GPS bị sai</Text>
                            </View>
                        )}
                    </View>
                )}

                {activeDelivery ? (
                    <View style={styles.taskCard}>
                        <View style={styles.taskHeader}>
                            <Text style={styles.taskEmoji}>📦</Text>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.taskTitle}>Đơn hàng đang đến!</Text>
                                <Text style={styles.taskId}>{activeDelivery.id}</Text>
                            </View>
                            <View style={[styles.statusBadge,
                            deliveryStatus === 'IN_TRANSIT' && styles.statusTransit,
                            deliveryStatus === 'APPROACHING' && styles.statusApproaching,
                            deliveryStatus === 'ARRIVED' && styles.statusArrived,
                            ]}>
                                <Text style={styles.statusText}>{deliveryStatus}</Text>
                            </View>
                        </View>

                        <View style={styles.taskDetails}>
                            <View style={styles.detailRow}><Text style={styles.detailLabel}>Hàng hóa:</Text><Text style={styles.detailValue}>{activeDelivery.items}</Text></View>
                            <View style={styles.detailRow}><Text style={styles.detailLabel}>Số lượng:</Text><Text style={styles.detailValue}>{activeDelivery.quantity}</Text></View>
                            <View style={styles.detailRow}><Text style={styles.detailLabel}>Drone:</Text><Text style={styles.detailValue}>🚁 {activeDelivery.droneId}</Text></View>
                            {activeDelivery.notes ? <View style={styles.detailRow}><Text style={styles.detailLabel}>Ghi chú:</Text><Text style={styles.detailValue}>{activeDelivery.notes}</Text></View> : null}
                        </View>

                        {deliveryStatus === 'APPROACHING' && (
                            <View style={styles.alertBox}>
                                <Text style={styles.alertText}>⚡ Drone đang đến gần! {'(< 500 m)'}</Text>
                            </View>
                        )}
                        {deliveryStatus === 'ARRIVED' && (
                            <View style={styles.arrivedBox}>
                                <Text style={styles.arrivedText}>🎉 Drone đã đến!</Text>
                                <TouchableOpacity style={styles.scanBtn} onPress={() => navigation.navigate('ScanQR')}><Text style={styles.scanBtnText}>📷 Quét mã QR để nhận hàng</Text></TouchableOpacity>
                            </View>
                        )}
                    </View>
                ) : (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyEmoji}>📭</Text>
                        <Text style={styles.emptyTitle}>Chưa có đơn hàng</Text>
                        <Text style={styles.emptyDesc}>Đang chờ Admin phân công nhiệm vụ...</Text>
                        <View style={styles.connectionStatus}><View style={styles.onlineDot} /><Text style={styles.connectionText}>Đang sẵn sàng nhận</Text></View>
                    </View>
                )}
                <View style={[styles.locationInfo, { marginBottom: 30 }]}><Text style={styles.locationTitle}>📍 Vị trí hiện tại</Text>{currentLocation ? <Text style={styles.locationText}>{currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}</Text> : <Text style={styles.locationText}>Đang lấy vị trí...</Text>}</View>
            </ScrollView>
        );
    }

    // ===================== ADMIN VIEW =====================
    if (role === 'ADMIN') {
        return (
            <View style={styles.adminContainer}>
                <View style={styles.adminPanel}>
                    <Text style={styles.adminTitle}>👨‍💼 Admin Dashboard</Text>

                    <View style={styles.statsRow}>
                        <View style={styles.statBox}><Text style={styles.statNumber}>{drones.length}</Text><Text style={styles.statLabel}>🚁 Drones</Text></View>
                        <View style={styles.statBox}><Text style={styles.statNumber}>{destinations.length}</Text><Text style={styles.statLabel}>📍 Điểm đến</Text></View>
                    </View>

                    <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreateModal(true)}>
                        <Text style={styles.createBtnText}>+ Giao nhiệm vụ mới</Text>
                    </TouchableOpacity>

                    <Text style={styles.sectionTitle}>Nhiệm vụ đang chạy ({activeDeliveries.length})</Text>
                    <ScrollView style={styles.activeTasksScroll}>
                        {activeDeliveries.length === 0 && <Text style={styles.emptyText}>Chưa có nhiệm vụ nào</Text>}
                        {activeDeliveries.map(d => (
                            <View key={d.id} style={styles.activeTaskItem}>
                                <Text style={styles.activeTaskTitle}>📦 {d.items} (x{d.quantity})</Text>
                                <Text style={styles.activeTaskSub}>{d.droneId} ➡️ {d.destId}</Text>
                                <Text style={[styles.activeTaskStatus, { color: d.status === 'ARRIVED' ? '#4CAF50' : d.status === 'APPROACHING' ? '#FF9800' : '#2196F3' }]}>{d.status}</Text>
                            </View>
                        ))}
                    </ScrollView>

                    <Text style={styles.sectionTitle}>✅ Đã hoàn thành ({completedDeliveries.length})</Text>
                    <ScrollView style={styles.completedTasksScroll}>
                        {completedDeliveries.length === 0 && <Text style={styles.emptyText}>Chưa có nhiệm vụ hoàn thành</Text>}
                        {completedDeliveries.map(d => (
                            <View key={d.id} style={styles.completedTaskItem}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Text style={styles.completedTaskTitle}>✅ {d.items} (x{d.quantity})</Text>
                                    <View style={styles.completedBadge}>
                                        <Text style={styles.completedBadgeText}>COMPLETED</Text>
                                    </View>
                                </View>
                                <Text style={styles.completedTaskSub}>{d.droneId} ➡️ {d.destId}</Text>
                                {d.completedAt && <Text style={styles.completedTaskTime}>🕐 {new Date(d.completedAt).toLocaleString()}</Text>}
                            </View>
                        ))}
                    </ScrollView>

                    <Text style={styles.sectionTitle}>Thiết bị Online:</Text>
                    <ScrollView style={styles.deviceListScroll}>
                        {availableDevices.map(d => (
                            <View key={d.id} style={styles.deviceRow}>
                                <Text>{d.role === 'DRONE' ? '🚁' : '📍'} {d.id}</Text>
                                <Text style={styles.roleTag}>{d.role}</Text>
                            </View>
                        ))}
                    </ScrollView>
                </View>

                <View style={styles.mapContainer}>
                    <MapView style={styles.map} region={{ latitude: 10.762622, longitude: 106.660172, latitudeDelta: 0.1, longitudeDelta: 0.1 }}>
                        {availableDevices.map(d => d.lat && (
                            <Marker key={d.id} coordinate={{ latitude: d.lat, longitude: d.lng }} title={d.id} description={d.role} pinColor={d.role === 'DRONE' ? 'blue' : 'red'} />
                        ))}
                    </MapView>
                </View>

                <Modal visible={showCreateModal} transparent animationType="fade">
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>📦 Phân công Drone</Text>
                            <Text style={styles.label}>Chọn Drone:</Text>
                            <View style={styles.selectionRow}>
                                {drones.length === 0 && <Text style={styles.emptyText}>Không có drone online</Text>}
                                {drones.map(d => {
                                    const isBusy = activeDeliveries.some(task => task.droneId === d.id && task.status !== 'DELIVERED');
                                    return (
                                        <TouchableOpacity
                                            key={d.id}
                                            disabled={isBusy}
                                            style={[
                                                styles.selectItem,
                                                selectedDrone === d.id && styles.selected,
                                                isBusy && styles.disabledItem
                                            ]}
                                            onPress={() => setSelectedDrone(d.id)}
                                        >
                                            <Text style={selectedDrone === d.id ? styles.selectedText : (isBusy ? styles.disabledText : {})}>
                                                🚁 {d.id} {isBusy ? '(Bận)' : ''}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                            <Text style={styles.label}>Chọn Điểm đến:</Text>
                            <View style={styles.selectionRow}>
                                {destinations.length === 0 && <Text style={styles.emptyText}>Không có điểm nhận online</Text>}
                                {destinations.map(d => (
                                    <TouchableOpacity key={d.id} style={[styles.selectItem, selectedDest === d.id && styles.selected]} onPress={() => setSelectedDest(d.id)}><Text style={selectedDest === d.id ? styles.selectedText : {}}>📍 {d.id}</Text></TouchableOpacity>
                                ))}
                            </View>
                            <Text style={styles.label}>Hàng hóa:</Text><TextInput style={styles.input} value={items} onChangeText={setItems} placeholder="VD: Cơm gà..." />
                            <Text style={styles.label}>Số lượng:</Text><TextInput style={styles.input} value={quantity} onChangeText={setQuantity} keyboardType="numeric" />
                            <Text style={styles.label}>Ghi chú:</Text><TextInput style={[styles.input, { height: 60 }]} value={notes} onChangeText={setNotes} placeholder="Ghi chú..." multiline />
                            <View style={styles.modalButtons}>
                                <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowCreateModal(false); resetForm(); }}><Text>Hủy</Text></TouchableOpacity>
                                <TouchableOpacity style={styles.submitBtn} onPress={handleCreateTask}><Text style={styles.submitText}>Gửi ngay</Text></TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            </View>
        );
    }

    // ===================== DRONE VIEW =====================
    return (
        <View style={styles.container}>
            <MapView style={styles.fullMap} showsUserLocation={true} onMapClick={handleMapClick} region={currentLocation ? { latitude: currentLocation.latitude, longitude: currentLocation.longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 } : undefined}>
                {availableDevices.map(d => d.id !== deviceId && d.lat && (
                    <Marker key={d.id} coordinate={{ latitude: d.lat, longitude: d.lng }} title={d.id} description={d.role} pinColor={d.role === 'DESTINATION' ? 'red' : 'blue'} />
                ))}
            </MapView>
            <View style={styles.bottomOverlay}>
                <Text style={styles.droneTitle}>🚁 Drone: {deviceId}</Text>
                <Text style={styles.statusInfo}>Trạng thái: {activeDelivery ? deliveryStatus : 'Chờ nhiệm vụ'}</Text>
                {Platform.OS === 'web' && (
                    <TouchableOpacity style={[styles.manualToggle, isManualLocation && styles.manualActive]} onPress={() => setIsManualLocation(!isManualLocation)}>
                        <Text style={isManualLocation ? styles.textWhite : {}}>{isManualLocation ? '📍 Vị trí thủ công (Click map để dời)' : '🌐 Vị trí GPS (Click map để dời)'}</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    adminContainer: { flex: 1, flexDirection: Platform.OS === 'web' ? 'row' : 'column' },
    adminPanel: { width: Platform.OS === 'web' ? 350 : '100%', backgroundColor: '#fff', padding: 20, borderRightWidth: Platform.OS === 'web' ? 1 : 0, borderRightColor: '#ddd', maxHeight: Platform.OS === 'web' ? '100%' : 500 },
    statsRow: { flexDirection: 'row', marginBottom: 15 },
    statBox: { flex: 1, backgroundColor: '#E3F2FD', padding: 15, borderRadius: 10, marginRight: 10, alignItems: 'center' },
    statNumber: { fontSize: 28, fontWeight: 'bold', color: '#1976D2' },
    statLabel: { fontSize: 12, color: '#666' },
    sectionTitle: { fontWeight: 'bold', marginTop: 15, marginBottom: 10, color: '#333' },
    activeTasksScroll: { maxHeight: 200, marginBottom: 10 },
    activeTaskItem: { backgroundColor: '#F1F8E9', padding: 12, borderRadius: 8, marginBottom: 8, borderLeftWidth: 4, borderLeftColor: '#4CAF50' },
    activeTaskTitle: { fontWeight: 'bold', fontSize: 14 },
    activeTaskSub: { fontSize: 12, color: '#666' },
    activeTaskStatus: { fontSize: 11, fontWeight: 'bold', marginTop: 4, textTransform: 'uppercase' },
    completedTasksScroll: { maxHeight: 200, marginBottom: 10 },
    completedTaskItem: { backgroundColor: '#E8F5E9', padding: 12, borderRadius: 8, marginBottom: 8, borderLeftWidth: 4, borderLeftColor: '#2E7D32' },
    completedTaskTitle: { fontWeight: 'bold', fontSize: 14, color: '#2E7D32' },
    completedTaskSub: { fontSize: 12, color: '#666', marginTop: 2 },
    completedTaskTime: { fontSize: 11, color: '#888', marginTop: 4 },
    completedBadge: { backgroundColor: '#C8E6C9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
    completedBadgeText: { fontSize: 10, fontWeight: 'bold', color: '#2E7D32' },
    deviceListScroll: { maxHeight: 150 },
    deviceRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 10, backgroundColor: '#f5f5f5', borderRadius: 6, marginBottom: 5 },
    roleTag: { fontSize: 10, color: '#888', backgroundColor: '#eee', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
    createBtn: { backgroundColor: '#2196F3', padding: 15, borderRadius: 10, alignItems: 'center' },
    createBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    mapContainer: { flex: 1 },
    map: { width: '100%', height: '100%' },
    destContainer: { flex: 1, backgroundColor: '#f5f5f5' },
    destHeader: { backgroundColor: '#4CAF50', padding: 25, paddingTop: 50, alignItems: 'center' },
    destTitle: { fontSize: 24, fontWeight: 'bold', color: 'white' },
    destId: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 5 },
    mapToggleButton: { marginTop: 15, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
    mapToggleText: { color: 'white', fontWeight: 'bold' },
    destMapContainer: { height: 300, margin: 15, borderRadius: 15, overflow: 'hidden', backgroundColor: '#eee' },
    destMap: { width: '100%', height: '100%' },
    mapHint: { position: 'absolute', bottom: 10, left: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.7)', padding: 8, borderRadius: 8 },
    mapHintText: { color: 'white', fontSize: 11, textAlign: 'center' },
    taskCard: { backgroundColor: 'white', margin: 15, borderRadius: 15, padding: 20, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
    taskHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
    taskEmoji: { fontSize: 40, marginRight: 15 },
    taskTitle: { fontSize: 18, fontWeight: 'bold' },
    taskId: { fontSize: 12, color: '#888' },
    statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    statusTransit: { backgroundColor: '#E3F2FD' },
    statusApproaching: { backgroundColor: '#FFF3E0' },
    statusArrived: { backgroundColor: '#E8F5E9' },
    statusText: { fontSize: 11, fontWeight: 'bold' },
    taskDetails: { borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 15 },
    detailRow: { flexDirection: 'row', marginBottom: 8 },
    detailLabel: { width: 80, color: '#888' },
    detailValue: { flex: 1, fontWeight: '500' },
    alertBox: { backgroundColor: '#FFF3E0', padding: 15, borderRadius: 10, marginTop: 15 },
    alertText: { color: '#E65100', fontWeight: '500', textAlign: 'center' },
    arrivedBox: { backgroundColor: '#E8F5E9', padding: 20, borderRadius: 10, marginTop: 15, alignItems: 'center' },
    arrivedText: { fontSize: 18, fontWeight: 'bold', color: '#2E7D32', marginBottom: 15 },
    scanBtn: { backgroundColor: '#4CAF50', padding: 15, borderRadius: 10, width: '100%', alignItems: 'center' },
    scanBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
    emptyState: { alignItems: 'center', padding: 40, margin: 15, backgroundColor: 'white', borderRadius: 15 },
    emptyEmoji: { fontSize: 60, marginBottom: 15 },
    emptyTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
    emptyDesc: { color: '#888', textAlign: 'center', marginBottom: 20 },
    connectionStatus: { flexDirection: 'row', alignItems: 'center' },
    onlineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#4CAF50', marginRight: 8 },
    connectionText: { color: '#4CAF50', fontWeight: '500' },
    locationInfo: { backgroundColor: 'white', margin: 15, padding: 15, borderRadius: 10 },
    locationTitle: { fontWeight: 'bold', marginBottom: 5 },
    locationText: { color: '#666', fontSize: 12 },
    container: { flex: 1 },
    fullMap: { width: '100%', height: '100%' },
    bottomOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(255, 255, 255, 0.95)', padding: 20, borderTopLeftRadius: 15, borderTopRightRadius: 15 },
    droneTitle: { fontSize: 18, fontWeight: 'bold' },
    statusInfo: { fontSize: 14, color: '#666', marginTop: 5 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalContent: { backgroundColor: 'white', borderRadius: 15, padding: 25, width: Platform.OS === 'web' ? 450 : '100%', maxWidth: 500 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    label: { fontWeight: 'bold', marginTop: 12, marginBottom: 6, color: '#555' },
    input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, backgroundColor: '#f9f9f9' },
    selectionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    selectItem: { padding: 12, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, backgroundColor: '#f9f9f9' },
    selected: { backgroundColor: '#2196F3', borderColor: '#1976D2' },
    selectedText: { color: 'white' },
    modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 25 },
    cancelBtn: { padding: 15, backgroundColor: '#eee', borderRadius: 8, flex: 1, marginRight: 10, alignItems: 'center' },
    submitBtn: { padding: 15, backgroundColor: '#4CAF50', borderRadius: 8, flex: 1, alignItems: 'center' },
    submitText: { color: 'white', fontWeight: 'bold' },
    manualToggle: { marginTop: 10, padding: 8, backgroundColor: '#f0f0f0', borderRadius: 5, alignItems: 'center' },
    manualActive: { backgroundColor: '#4CAF50' },
    textWhite: { color: 'white' },
    emptyText: { color: '#999', fontStyle: 'italic', padding: 10 },
    disabledItem: { backgroundColor: '#e0e0e0', borderColor: '#ccc', opacity: 0.7 },
    disabledText: { color: '#999' }
});

export default HomeScreen;
