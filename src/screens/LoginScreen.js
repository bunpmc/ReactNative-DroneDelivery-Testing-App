import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, TouchableOpacity, Platform, ScrollView } from 'react-native';
import { useAppContext } from '../context/AppContext';

const LoginScreen = ({ navigation }) => {
    const [inputDeviceId, setInputDeviceId] = useState('');
    const [serverUrl, setServerIp] = useState('https://prayer-judge-angel-hosted.trycloudflare.com');
    const [selectedRole, setSelectedRole] = useState('DRONE');

    const { connectToServer } = useAppContext();

    const handleConnect = () => {
        if (!inputDeviceId.trim()) {
            if (Platform.OS === 'web') {
                window.alert('Vui lòng nhập Device ID');
            } else {
                Alert.alert('Lỗi', 'Vui lòng nhập Device ID');
            }
            return;
        }
        connectToServer(inputDeviceId, selectedRole, serverUrl);
        navigation.replace('Home');
    };

    const roles = [
        { id: 'DRONE', label: '🚁 DRONE', desc: 'Thiết bị giao hàng' },
        { id: 'DESTINATION', label: '📍 DESTINATION', desc: 'Điểm nhận hàng' },
        { id: 'ADMIN', label: '👨‍💼 ADMIN', desc: 'Quản lý & phân công' },
    ];

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>🚁 Drone Delivery System</Text>

            <Text style={styles.label}>Device ID:</Text>
            <TextInput
                style={styles.input}
                value={inputDeviceId}
                onChangeText={setInputDeviceId}
                placeholder="VD: Drone-01, Admin-01"
            />

            <Text style={styles.label}>Server URL:</Text>
            <TextInput
                style={styles.input}
                value={serverUrl}
                onChangeText={setServerIp}
                autoCapitalize="none"
                placeholder="https://doubt-heavily-guy-hull.trycloudflare.com"
            />

            <Text style={styles.label}>Vai trò:</Text>
            <View style={styles.roleContainer}>
                {roles.map(r => (
                    <TouchableOpacity
                        key={r.id}
                        style={[styles.roleBtn, selectedRole === r.id && styles.roleBtnActive]}
                        onPress={() => setSelectedRole(r.id)}
                    >
                        <Text style={[styles.roleText, selectedRole === r.id && styles.textActive]}>{r.label}</Text>
                        <Text style={[styles.roleDesc, selectedRole === r.id && styles.textActive]}>{r.desc}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <TouchableOpacity style={styles.connectBtn} onPress={handleConnect}>
                <Text style={styles.connectText}>Kết nối hệ thống</Text>
            </TouchableOpacity>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 20,
        backgroundColor: '#f5f5f5',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 30,
        textAlign: 'center',
        color: '#333',
    },
    label: {
        fontWeight: 'bold',
        marginBottom: 5,
        marginTop: 15,
        color: '#555',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        padding: 12,
        borderRadius: 8,
        backgroundColor: '#fff',
        fontSize: 16,
    },
    roleContainer: {
        marginBottom: 20,
        marginTop: 10,
    },
    roleBtn: {
        padding: 15,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 10,
        marginVertical: 5,
        backgroundColor: '#fff',
    },
    roleBtnActive: {
        backgroundColor: '#2196F3',
        borderColor: '#1976D2',
    },
    roleText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    roleDesc: {
        fontSize: 12,
        color: '#666',
        marginTop: 3,
    },
    textActive: {
        color: 'white'
    },
    connectBtn: {
        backgroundColor: '#4CAF50',
        padding: 18,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 10,
    },
    connectText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    }
});

export default LoginScreen;
