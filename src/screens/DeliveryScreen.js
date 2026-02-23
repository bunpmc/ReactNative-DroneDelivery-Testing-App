import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Button, Alert, Platform } from 'react-native';
import MapView, { Marker, Polyline } from '../components/MapWrapper';
import { useAppContext } from '../context/AppContext';
import QRCode from 'react-native-qrcode-svg';

const DeliveryScreen = ({ navigation }) => {
    const {
        role, activeDelivery, deliveryStatus,
        currentLocation, otherDeviceLocation,
        setManualLocation, isManualLocation, setIsManualLocation
    } = useAppContext();

    const [lastAlertedStatus, setLastAlertedStatus] = useState(null);

    const handleMapClick = (coord) => {
        if (Platform.OS === 'web') {
            setManualLocation(coord.latitude, coord.longitude);
        }
    };

    // Show notification on status change
    useEffect(() => {
        if (deliveryStatus && deliveryStatus !== lastAlertedStatus) {
            let message = null;

            if (deliveryStatus === 'APPROACHING') {
                message = role === 'DESTINATION'
                    ? "🚁 Drone đang đến gần! (< 500 m)"
                    : "📍 Đang đến gần điểm nhận hàng! (< 500 m)";
            } else if (deliveryStatus === 'ARRIVED') {
                message = role === 'DESTINATION'
                    ? '🚁 Drone đã đến! Hãy quét mã QR để nhận hàng.'
                    : '📍 Đã đến điểm giao hàng! Hiện mã QR cho khách.';
            } else if (deliveryStatus === 'DELIVERED') {
                message = '✅ Giao hàng thành công!';
            }

            if (message) {
                if (Platform.OS === 'web') {
                    // Use browser notification or simple alert
                    window.alert(message);
                } else {
                    Alert.alert('Thông báo', message);
                }
                setLastAlertedStatus(deliveryStatus);
            }
        }
    }, [deliveryStatus, role, lastAlertedStatus]);

    if (!activeDelivery) {
        return (
            <View style={styles.center}><Text>No Active Delivery</Text></View>
        );
    }

    const myLat = currentLocation?.latitude;
    const myLng = currentLocation?.longitude;
    const partnerLat = otherDeviceLocation?.latitude;
    const partnerLng = otherDeviceLocation?.longitude;

    // Calculate region center
    const regionCenter = (myLat && partnerLat) ? {
        latitude: (myLat + partnerLat) / 2,
        longitude: (myLng + partnerLng) / 2,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
    } : myLat ? {
        latitude: myLat,
        longitude: myLng,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
    } : undefined;

    // Status color
    const getStatusColor = () => {
        switch (deliveryStatus) {
            case 'APPROACHING': return '#FF9800';
            case 'ARRIVED': return '#4CAF50';
            case 'DELIVERED': return '#2196F3';
            default: return '#666';
        }
    };

    return (
        <View style={styles.container}>
            <MapView
                style={styles.map}
                showsUserLocation={true}
                onMapClick={handleMapClick}
                region={regionCenter}
            >
                {/* My Location Marker */}
                {myLat && (
                    <Marker
                        coordinate={{ latitude: myLat, longitude: myLng }}
                        title={role === 'DRONE' ? "Tôi (Drone)" : "Tôi (Destination)"}
                        pinColor={role === 'DRONE' ? "blue" : "green"}
                    />
                )}

                {/* Partner Marker */}
                {partnerLat && (
                    <Marker
                        coordinate={{ latitude: partnerLat, longitude: partnerLng }}
                        title={role === 'DRONE' ? "Điểm đến" : "Drone"}
                        pinColor={role === 'DRONE' ? "red" : "blue"}
                    />
                )}

                {/* Route Line */}
                {myLat && partnerLat && (
                    <Polyline
                        coordinates={[
                            { latitude: myLat, longitude: myLng },
                            { latitude: partnerLat, longitude: partnerLng }
                        ]}
                        strokeColor={getStatusColor()}
                        strokeWidth={3}
                    />
                )}
            </MapView>

            {/* Status Banner */}
            <View style={[styles.statusBanner, { backgroundColor: getStatusColor() }]}>
                <Text style={styles.statusBannerText}>
                    {deliveryStatus === 'IN_TRANSIT' && '🚚 Đang vận chuyển...'}
                    {deliveryStatus === 'APPROACHING' && '⚡ Đang đến gần!'}
                    {deliveryStatus === 'ARRIVED' && '📍 Đã đến nơi!'}
                    {deliveryStatus === 'DELIVERED' && '✅ Đã giao hàng!'}
                </Text>
            </View>

            <View style={styles.overlay}>
                <Text style={styles.title}>Vai trò: {role === 'DRONE' ? '🚁 Drone' : '📍 Điểm đến'}</Text>
                <Text style={styles.info}>Đơn hàng: {activeDelivery.id}</Text>

                {/* DRONE VIEW: Show QR when ARRIVED */}
                {role === 'DRONE' && (deliveryStatus === 'ARRIVED' || deliveryStatus === 'DELIVERED') && (
                    <View style={styles.qrContainer}>
                        <Text style={{ marginBottom: 10, fontWeight: 'bold' }}>Mã xác nhận: {activeDelivery.secretCode}</Text>
                        {Platform.OS !== 'web' && <QRCode value={activeDelivery.secretCode} size={150} />}
                        {Platform.OS === 'web' && (
                            <View style={styles.webQR}>
                                <Text style={{ fontSize: 48 }}>{activeDelivery.secretCode}</Text>
                                <Text style={{ fontSize: 12, color: '#666' }}>Đưa mã này cho khách</Text>
                            </View>
                        )}
                    </View>
                )}

                {Platform.OS === 'web' && (
                    <View style={styles.webManualInfo}>
                        <Text style={{ fontSize: 11, color: '#666', textAlign: 'center' }}>
                            {isManualLocation
                                ? '📍 Vị trí thủ công đang bật. Click map để dời.'
                                : '🌐 Đang dùng GPS mặc định. Bấm map để dời.'}
                        </Text>
                        <TouchableOpacity onPress={() => setIsManualLocation(false)}>
                            <Text style={{ color: '#2196F3', fontSize: 11, marginTop: 4 }}>Reset GPS</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* DESTINATION VIEW: Scan Button when ARRIVED */}
                {role === 'DESTINATION' && deliveryStatus === 'ARRIVED' && (
                    <View style={{ marginTop: 15 }}>
                        <Button
                            title="📷 Quét mã QR của Drone"
                            onPress={() => navigation.navigate('ScanQR')}
                        />
                    </View>
                )}

                {role === 'DESTINATION' && deliveryStatus === 'DELIVERED' && (
                    <Text style={styles.success}>✅ Đã nhận hàng thành công!</Text>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    map: { width: '100%', height: '100%' },
    statusBanner: {
        position: 'absolute',
        top: 50,
        left: 20,
        right: 20,
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
    },
    statusBannerText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    overlay: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 10,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        alignItems: 'center'
    },
    title: { fontSize: 18, fontWeight: 'bold' },
    info: { marginBottom: 10, color: '#666' },
    qrContainer: {
        alignItems: 'center',
        marginTop: 10
    },
    webQR: {
        padding: 20,
        backgroundColor: '#f0f0f0',
        borderRadius: 10,
        alignItems: 'center'
    },
    success: {
        color: 'green',
        fontSize: 20,
        fontWeight: 'bold',
        marginTop: 10
    },
    webManualInfo: {
        marginTop: 10,
        alignItems: 'center',
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#eee',
        width: '100%'
    }
});

export default DeliveryScreen;
