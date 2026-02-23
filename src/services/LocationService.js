import * as Location from 'expo-location';
import { Alert } from 'react-native';

const LocationService = {
    requestPermissions: async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Permission to access location was denied');
                return false;
            }
            return true;
        } catch (error) {
            console.error("Error requesting permissions:", error);
            return false;
        }
    },

    getCurrentLocation: async () => {
        try {
            const location = await Location.getCurrentPositionAsync({});
            return location.coords;
        } catch (error) {
            console.error("Error getting location:", error);
            return null;
        }
    },

    watchLocation: async (callback) => {
        try {
            const subscription = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.High,
                    timeInterval: 1000,
                    distanceInterval: 1,
                },
                (location) => {
                    callback(location.coords);
                }
            );
            return subscription;
        } catch (error) {
            console.error("Error watching location:", error);
            return null;
        }
    }
};

export default LocationService;
