import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Modal, Alert, ScrollView } from 'react-native';
import { dataManager } from '../data/DataManager';

const OrderManagement = ({ visible, onClose }) => {
    const [orders, setOrders] = useState(dataManager.getOrders());
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState(null);

    // Form State
    const [items, setItems] = useState('');
    const [weight, setWeight] = useState('');
    const [destName, setDestName] = useState('');
    const [destLat, setDestLat] = useState('10.7629');
    const [destLng, setDestLng] = useState('106.6822');

    // Subscribe to updates
    React.useEffect(() => {
        const unsubscribe = dataManager.subscribe(() => {
            setOrders([...dataManager.getOrders()]);
        });
        return unsubscribe;
    }, []);

    const handleSave = () => {
        if (!items || !destName) {
            Alert.alert("Error", "Please fill required fields");
            return;
        }

        const orderData = {
            items,
            weight: parseFloat(weight) || 1.0,
            destination: {
                name: destName,
                lat: parseFloat(destLat) || 10.7629,
                lng: parseFloat(destLng) || 106.6822,
            }
        };

        if (isEditing && editingId) {
            dataManager.updateOrder(editingId, orderData);
        } else {
            dataManager.addOrder(orderData);
        }

        resetForm();
    };

    const handleEdit = (item) => {
        setItems(item.items);
        setWeight(item.weight.toString());
        setDestName(item.destination.name);
        setDestLat(item.destination.lat.toString());
        setDestLng(item.destination.lng.toString());
        setEditingId(item.id);
        setIsEditing(true);
    };

    const handleDelete = (id) => {
        Alert.alert(
            "Confirm Delete",
            "Are you sure?",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: () => dataManager.deleteOrder(id) }
            ]
        );
    };

    const resetForm = () => {
        setItems('');
        setWeight('');
        setDestName('');
        setIsEditing(false);
        setEditingId(null);
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>Manage Orders</Text>
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                        <Text style={styles.closeText}>Close</Text>
                    </TouchableOpacity>
                </View>

                {/* Form */}
                <View style={styles.form}>
                    <Text style={styles.sectionTitle}>{isEditing ? 'Edit Order' : 'Add New Order'}</Text>
                    <TextInput style={styles.input} placeholder="Items (e.g. Pizza)" value={items} onChangeText={setItems} />
                    <View style={styles.row}>
                        <TextInput style={[styles.input, { flex: 1 }]} placeholder="Weight (kg)" value={weight} onChangeText={setWeight} keyboardType="numeric" />
                        <TextInput style={[styles.input, { flex: 2, marginLeft: 10 }]} placeholder="Dest Name" value={destName} onChangeText={setDestName} />
                    </View>
                    <View style={styles.row}>
                        <TextInput style={[styles.input, { flex: 1 }]} placeholder="Lat" value={destLat} onChangeText={setDestLat} keyboardType="numeric" />
                        <TextInput style={[styles.input, { flex: 1, marginLeft: 10 }]} placeholder="Lng" value={destLng} onChangeText={setDestLng} keyboardType="numeric" />
                    </View>
                    <View style={styles.row}>
                        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                            <Text style={styles.btnText}>{isEditing ? 'Update' : 'Add'}</Text>
                        </TouchableOpacity>
                        {isEditing && (
                            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: '#999', marginLeft: 10 }]} onPress={resetForm}>
                                <Text style={styles.btnText}>Cancel</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* List */}
                <FlatList
                    data={orders}
                    keyExtractor={item => item.id}
                    style={styles.list}
                    renderItem={({ item }) => (
                        <View style={styles.listItem}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.itemTitle}>#{item.id} - {item.items}</Text>
                                <Text style={styles.itemSub}>{item.destination.name}</Text>
                            </View>
                            <View style={styles.actions}>
                                <TouchableOpacity style={[styles.actionBtn, styles.editBtn]} onPress={() => handleEdit(item)}>
                                    <Text style={styles.actionText}>Edit</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={() => handleDelete(item.id)}>
                                    <Text style={styles.actionText}>Del</Text>
                                </TouchableOpacity>
                            </View>
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
    saveBtn: { backgroundColor: '#4CAF50', padding: 12, borderRadius: 8, flex: 1, alignItems: 'center' },
    btnText: { color: 'white', fontWeight: 'bold' },
    list: { flex: 1 },
    listItem: { backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 10, flexDirection: 'row', alignItems: 'center' },
    itemTitle: { fontWeight: 'bold', fontSize: 16 },
    itemSub: { color: '#666' },
    actions: { flexDirection: 'row' },
    actionBtn: { padding: 8, borderRadius: 6, marginLeft: 5 },
    editBtn: { backgroundColor: '#FFC107' },
    deleteBtn: { backgroundColor: '#F44336' },
    actionText: { color: 'white', fontSize: 12, fontWeight: 'bold' }
});

export default OrderManagement;
