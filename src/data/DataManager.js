import { mockOrders, mockDrones } from './mockData';

class DataManager {
    constructor() {
        this.orders = [...mockOrders];
        this.drones = [...mockDrones];
        this.listeners = [];
    }

    // --- Observer Pattern for UI Updates ---
    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    notify() {
        this.listeners.forEach(listener => listener());
    }

    // --- Orders CRUD ---
    getOrders() {
        return this.orders;
    }

    addOrder(order) {
        // Generate simple ID if not provided
        if (!order.id) {
            order.id = `D${Math.floor(Math.random() * 10000)}`;
        }
        this.orders.push(order);
        this.notify();
    }

    updateOrder(id, updatedData) {
        const index = this.orders.findIndex(o => o.id === id);
        if (index !== -1) {
            this.orders[index] = { ...this.orders[index], ...updatedData };
            this.notify();
        }
    }

    deleteOrder(id) {
        this.orders = this.orders.filter(o => o.id !== id);
        this.notify();
    }

    // --- Drones CRUD ---
    getDrones() {
        return this.drones;
    }

    addDrone(drone) {
        if (!drone.id) {
            drone.id = `${Math.floor(Math.random() * 100)}`;
        }
        this.drones.push(drone);
        this.notify();
    }

    updateDrone(id, updatedData) {
        const index = this.drones.findIndex(d => d.id === id);
        if (index !== -1) {
            this.drones[index] = { ...this.drones[index], ...updatedData };
            this.notify();
        }
    }

    deleteDrone(id) {
        this.drones = this.drones.filter(d => d.id !== id);
        this.notify();
    }
}

// Export singleton
export const dataManager = new DataManager();
