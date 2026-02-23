import React, { useState, useEffect } from 'react';
import { Text, View, StyleSheet, Button, Alert } from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import { useAppContext } from '../context/AppContext';

const ScanQRScreen = ({ navigation }) => {
    const [hasPermission, setHasPermission] = useState(null);
    const [scanned, setScanned] = useState(false);
    const { confirmDelivery, activeDelivery } = useAppContext();

    useEffect(() => {
        (async () => {
            const { status } = await Camera.requestCameraPermissionsAsync();
            setHasPermission(status === 'granted');
        })();
    }, []);

    // Auto-close when delivery is completed (activeDelivery becomes null)
    useEffect(() => {
        if (!activeDelivery && scanned) {
            // Already handled / completed
            Alert.alert("Thành công", "Giao hàng hoàn tất!", [
                { text: "OK", onPress: () => navigation.canGoBack() && navigation.goBack() }
            ]);
        }
    }, [activeDelivery, scanned]);

    const handleBarCodeScanned = ({ type, data }) => {
        setScanned(true);
        confirmDelivery(data);
    };

    if (hasPermission === null) {
        return <View style={styles.container}><Text>Requesting for camera permission</Text></View>;
    }
    if (hasPermission === false) {
        return <View style={styles.container}><Text>No access to camera</Text></View>;
    }

    return (
        <View style={styles.container}>
            <CameraView
                style={StyleSheet.absoluteFillObject}
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                barcodeScannerSettings={{
                    barcodeTypes: ["qr", "pdf417"],
                }}
            />
            {scanned && (
                <View style={styles.processingOverlay}>
                    <Text style={styles.processingText}>⏳ Đang xử lý...</Text>
                </View>
            )}
            <View style={styles.overlay}>
                <Text style={styles.text}>Scan Drone's QR Code</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'column',
        justifyContent: 'center',
        backgroundColor: 'black'
    },
    overlay: {
        position: 'absolute',
        bottom: 50,
        alignSelf: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
        padding: 10,
        borderRadius: 5
    },
    text: {
        color: 'white',
        fontSize: 16
    },
    processingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10
    },
    processingText: {
        color: 'white',
        fontSize: 24,
        fontWeight: 'bold'
    }
});

export default ScanQRScreen;
