
export const mockOrders = [
  {
    id: "D2601",
    items: "Cơm gà + Trà sữa",
    weight: 1.2,
    destination: {
      name: "KTX Khu B (Student Dorm)",
      lat: 10.7629,
      lng: 106.6822,
    }
  },
  {
    id: "D2602",
    items: "Pizza + Coke",
    weight: 2.5,
    destination: {
      name: "Landmark 81",
      lat: 10.7950,
      lng: 106.7218,
    }
  },
  {
    id: "D2603",
    items: "Medicine Package",
    weight: 0.5,
    destination: {
      name: "Cho Ben Thanh",
      lat: 10.7721,
      lng: 106.6983,
    }
  }
];

export const mockDrones = [
  {
    id: "07",
    model: "X-2000 Standard",
    battery: 95,
    status: "Available",
    maxPayload: 2.0, // kg
    maxRange: 15,    // km
    maxSpeed: 50,    // km/h
  },
  {
    id: "08",
    model: "Speedster Pro",
    battery: 82,
    status: "Available",
    maxPayload: 1.5,
    maxRange: 10,
    maxSpeed: 70,
  },
  {
    id: "09",
    model: "Heavy Lift Titan",
    battery: 45,
    status: "Charging",
    maxPayload: 5.0,
    maxRange: 25,
    maxSpeed: 40,
  }
];

// Helper to interpolate route
export const generateFakeRoute = (startPoint, endPoint, totalPoints = 37) => {
  const waypoints = [];
  const startLat = startPoint.lat;
  const startLng = startPoint.lng;
  const endLat = endPoint.lat;
  const endLng = endPoint.lng;

  // Linear interpolation steps
  const latStep = (endLat - startLat) / (totalPoints - 1);
  const lngStep = (endLng - startLng) / (totalPoints - 1);

  // Battery simulation settings
  const startBattery = 95;
  const endBattery = 88;
  const batteryStep = (startBattery - endBattery) / (totalPoints - 1);

  for (let i = 0; i < totalPoints; i++) {
    // 1. Position
    const lat = startLat + latStep * i;
    const lng = startLng + lngStep * i;

    // 2. Altitude Logic
    // 50m at start/end (approx first 5 and last 5 points)
    // 120m in middle
    let altitude = 120;
    if (i < 5 || i >= totalPoints - 5) {
      altitude = 50;
    }

    // 3. Battery Logic
    const battery = startBattery - batteryStep * i;

    // 4. Timestamp
    const timestamp = i * 5; // increments by 5 seconds each point (mock time)

    waypoints.push({
      lat,
      lng,
      altitude,
      speed: 45, // Constant speed 45 km/h
      battery,
      timestamp,
    });
  }

  return waypoints;
};
