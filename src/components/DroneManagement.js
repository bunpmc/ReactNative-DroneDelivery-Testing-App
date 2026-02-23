import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Modal, Alert, ScrollView } from 'react-native';
import { dataManager } from '../data/DataManager';

const DroneManagement = ({ visible, onClose }) => {
    const [drones, setDrones] = useState(dataManager.getDrones());

    // Form State
    const [model, setModel] = useState('');
    const [battery, setBattery] = useState('100');
    const [maxPayload, setMaxPayload] = useState('');
    const [maxRange, setMaxRange] = useState('');
    const [maxSpeed, setMaxSpeed] = useState('');

    // Subscribe to updates
    React.useEffect(() => {
        const unsubscribe = dataManager.subscribe(() => {
            setDrones([...dataManager.getDrones()]);
        });
        return unsubscribe;
    }, []);

    const handleAdd = () => {
        if (!model || !maxPayload) {
            Alert.alert("Error", "Model and Payload are required");
            return;
        }
        dataManager.addDrone({
            model,
            battery: parseFloat(battery) || 100,
            status: 'Available',
            maxPayload: parseFloat(maxPayload) || 2.0,
            maxRange: parseFloat(maxRange) || 15,
            maxSpeed: parseFloat(maxSpeed) || 50
        });
        resetForm();
    };

    const handleDelete = (id) => {
        dataManager.deleteDrone(id);
    };

    const resetForm = () => {
        setModel('');
        setBattery('100');
        setMaxPayload('');
        setMaxRange('');
        setMaxSpeed('');
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>Manage Fleet</Text>
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                        <Text style={styles.closeText}>Close</Text>
                    </TouchableOpacity>
                </View>

                {/* Add Form */}
                <View style={styles.form}>
                    <Text style={styles.sectionTitle}>Add New Drone</Text>
                    <View style={styles.row}>
                        <TextInput style={[styles.input, { flex: 2 }]} placeholder="Model Name" value={model} onChangeText={setModel} />
                        <TextInput style={[styles.input, { flex: 1, marginLeft: 10 }]} placeholder="Bat %" value={battery} onChangeText={setBattery} keyboardType="numeric" />
                    </View>
                    <View style={styles.row}>
                        <TextInput style={[styles.input, { flex: 1 }]} placeholder="Payload (kg)" value={maxPayload} onChangeText={setMaxPayload} keyboardType="numeric" />
                        <TextInput style={[styles.input, { flex: 1, marginLeft: 10 }]} placeholder="Range (km)" value={maxRange} onChangeText={setMaxRange} keyboardType="numeric" />
                        <TextInput style={[styles.input, { flex: 1, marginLeft: 10 }]} placeholder="Speed (km/h)" value={maxSpeed} onChangeText={setMaxSpeed} keyboardType="numeric" />
                    </View>
                    <TouchableOpacity style={styles.saveBtn} onPress={handleAdd}>
                        <Text style={styles.btnText}>Add to Fleet</Text>
                    </TouchableOpacity>
                </View>

                {/* List */}
                <FlatList
                    data={drones}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => (
                        <View style={styles.listItem}>
                            <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginRight: 10 }}>
                                    <Text style={styles.itemTitle}>{item.model}</Text>
                                    <View style={[styles.badge, { backgroundColor: item.status === 'Available' ? '#E8F5E9' : '#FFF3E0' }]}>
                                        <Text style={[styles.badgeText, { color: item.status === 'Available' ? '#2E7D32' : '#EF6C00' }]}>{item.status}</Text>
                                    </View>
                                </View>
                                <Text style={styles.itemSub}>ID: {item.id} • Bat: {item.battery}%</Text>

                                {/* Tech Specs Grid */}
                                <View style={styles.specsRow}>
                                    <Text style={styles.specLabel}>📦 {item.maxPayload || 0} kg</Text>
                                    <Text style={styles.specLabel}>📏 {item.maxRange || 0} km</Text>
                                    <Text style={styles.specLabel}>🚀 {item.maxSpeed || 0} km/h</Text>
                                </View>
                            </View>
                            <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item.id)}>
                                <Text style={styles.actionText}>Del</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                />
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f0f0f0', padding: 20, paddingTop: 50 },
    header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    title: { fontSize: 24, fontWeight: 'bold' },
    closeBtn: { padding: 5 },
    closeText: { fontSize: 18, color: 'blue' },
    form: { backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 20 },
    sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 10 },
    input: { borderWidth: 1, borderColor: '#ddd', padding: 10, borderRadius: 8, marginBottom: 10, backgroundColor: '#fafafa' },
    row: { flexDirection: 'row' },
    saveBtn: { backgroundColor: '#4CAF50', padding: 12, borderRadius: 8, alignItems: 'center' },
    btnText: { color: 'white', fontWeight: 'bold' },
    listItem: { backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 10, flexDirection: 'row', alignItems: 'center' },
    itemTitle: { fontWeight: 'bold', fontSize: 16 },
    itemSub: { color: '#666', marginBottom: 8 },
    specsRow: { flexDirection: 'row', marginTop: 5 },
    specLabel: { fontSize: 12, color: '#444', marginRight: 15, backgroundColor: '#f5f5f5', padding: 4, borderRadius: 4 },
    badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
    badgeText: { fontSize: 12, fontWeight: 'bold' },
    deleteBtn: { backgroundColor: '#F44336', padding: 8, borderRadius: 6 },
    actionText: { color: 'white', fontSize: 12, fontWeight: 'bold' }
});

export default DroneManagement;
