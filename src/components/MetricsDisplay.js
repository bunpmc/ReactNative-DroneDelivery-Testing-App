import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const MetricsDisplay = ({ currentWaypoint }) => {
    if (!currentWaypoint) return null;

    return (
        <View style={styles.container}>
            <View style={styles.row}>
                <View style={styles.metricItem}>
                    <Text style={styles.label}>Battery ⚡</Text>
                    <Text style={styles.value}>{currentWaypoint.battery.toFixed(1)}%</Text>
                </View>
                <View style={styles.metricItem}>
                    <Text style={styles.label}>Speed 🚀</Text>
                    <Text style={styles.value}>{currentWaypoint.speed} km/h</Text>
                </View>
                <View style={styles.metricItem}>
                    <Text style={styles.label}>Altitude 📐</Text>
                    <Text style={styles.value}>{currentWaypoint.altitude}m</Text>
                </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.row}>
                <View style={styles.metricItem}>
                    <Text style={styles.label}>Latitude 📍</Text>
                    <Text style={styles.value}>{currentWaypoint.lat.toFixed(4)}</Text>
                </View>
                <View style={styles.metricItem}>
                    <Text style={styles.label}>Longitude 📍</Text>
                    <Text style={styles.value}>{currentWaypoint.lng.toFixed(4)}</Text>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 15,
        marginVertical: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 5,
    },
    metricItem: {
        alignItems: 'center',
        flex: 1,
    },
    label: {
        fontSize: 12,
        color: '#666',
        marginBottom: 4,
    },
    value: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
    },
    divider: {
        height: 1,
        backgroundColor: '#f0f0f0',
        marginVertical: 8,
    },
});

export default MetricsDisplay;
