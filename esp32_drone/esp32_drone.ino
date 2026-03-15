#include <WiFi.h>
#include <WiFiManager.h>
#include <PubSubClient.h>
#include <WiFiClientSecure.h>
#include <ESPmDNS.h>
#include <ArduinoJson.h>

// --- HIVEMQ CLOUD ---
const char* mqtt_host       = "d130275373b6451bac4640918d94bb1c.s1.eu.hivemq.cloud";
const int   mqtt_port       = 8883;
const char* mqtt_user       = "esp32";
const char* mqtt_pass       = "Esp323232";
const char* topic_in        = "drone/fc/in";
const char* topic_out       = "drone/fc/out";
const char* topic_telemetry = "drone/telemetry";

#define TX_PIN 17
#define RX_PIN 18

WiFiClientSecure net;
PubSubClient mqtt(net);

const int tcp_port = 8888;
WiFiServer tcpServer(tcp_port);
WiFiClient tcpClient;

uint8_t fcBuffer[256];
int fcLen = 0;
uint8_t fcPreBuffer[512];
int fcPreLen = 0;
unsigned long lastPublish = 0;
unsigned long lastMqttAttempt = 0;
unsigned long lastJsonTelemetry = 0;

bool isMotorRunning = false;
int motorThrottle = 1000;
unsigned long lastMspRcTime = 0;
int motorState = 0; // 0=idle, 1=arming, 2=flying
unsigned long armStartTime = 0;

// --- MSP Helper ---
void sendMspPacket(uint8_t cmd, uint8_t* payload, uint8_t size) {
  uint8_t crc = size ^ cmd;
  Serial1.write('$');
  Serial1.write('M');
  Serial1.write('<');
  Serial1.write(size);
  Serial1.write(cmd);
  for (uint8_t i = 0; i < size; i++) {
    if (payload != NULL) {
      Serial1.write(payload[i]);
      crc ^= payload[i];
    }
  }
  Serial1.write(crc);
}

void sendRcPacket(uint16_t throttle, uint16_t aux1) {
  uint16_t rc[8] = {1500, 1500, throttle, 1500, aux1, 1000, 1000, 1000};
  uint8_t payload[16];
  for (int i = 0; i < 8; i++) {
    payload[i*2]   = rc[i] & 0xFF;
    payload[i*2+1] = (rc[i] >> 8) & 0xFF;
  }
  sendMspPacket(200, payload, 16);
}

void sendWaypoint(float lat, float lon, float alt) {
  int32_t lat_i  = lat * 10000000;
  int32_t lon_i  = lon * 10000000;
  int32_t alt_cm = alt * 100;

  uint8_t payload[21];
  payload[0] = 1;
  memcpy(&payload[1],  &lat_i,  4);
  memcpy(&payload[5],  &lon_i,  4);
  memcpy(&payload[9],  &alt_cm, 4);
  int16_t zero = 0;
  memcpy(&payload[13], &zero, 2);
  memcpy(&payload[15], &zero, 2);
  memcpy(&payload[17], &zero, 2);
  payload[19] = 1;
  payload[20] = 0x01;

  sendMspPacket(209, payload, 21);
}

void onMqttMessage(char* topic, byte* payload, unsigned int length) {
  char msgStr[length + 1];
  memcpy(msgStr, payload, length);
  msgStr[length] = '\0';

  if (strcmp(topic, topic_in) == 0 && length > 0 && msgStr[0] == '{') {
    Serial.printf("[MQTT] JSON: %s\n", msgStr);
    StaticJsonDocument<256> doc;
    DeserializationError error = deserializeJson(doc, msgStr);

    if (!error) {
      const char* cmd = doc["cmd"];

      if (cmd && strcmp(cmd, "start_motor") == 0) {
        float targetLat = doc["lat"]      | 0.0f;
        float targetLon = doc["lon"]      | 0.0f;
        int throttlePct = doc["throttle"] | 10;

        motorThrottle = 1000 + (throttlePct * 10);
        if (motorThrottle > 1200) motorThrottle = 1200;
        if (motorThrottle < 1000) motorThrottle = 1000;

        Serial.printf("[MSP] start_motor, throttle=%d\n", motorThrottle);

        isMotorRunning = true;
        motorState = 1; // → ARMING
        armStartTime = millis();

        if (targetLat != 0.0f && targetLon != 0.0f) {
          delay(200);
          sendWaypoint(targetLat, targetLon, 20.0f);
          delay(100);
          sendMspPacket(250, NULL, 0);
          Serial.printf("[MSP] Waypoint: %.6f, %.6f\n", targetLat, targetLon);
        }

        return;
      }

      if (cmd && strcmp(cmd, "stop_motor") == 0) {
        for (int i = 0; i < 10; i++) {
          sendRcPacket(1000, 1000);
          delay(20);
        }
        isMotorRunning = false;
        motorState = 0;
        motorThrottle = 1000;
        Serial.println("[MSP] DISARM sent, motor stopped");
        return;
      }

    } else {
      Serial.printf("[MQTT] JSON error: %s\n", error.c_str());
    }
    return;
  }

  // Không phải JSON -> bridge thẳng xuống FC
  for (unsigned int i = 0; i < length; i++) {
    Serial1.write(payload[i]);
  }
}

void connectMQTT() {
  net.setInsecure();
  mqtt.setServer(mqtt_host, mqtt_port);
  mqtt.setCallback(onMqttMessage);
  mqtt.setBufferSize(512);
  mqtt.setKeepAlive(30);
  mqtt.setSocketTimeout(30);

  int attempts = 0;
  while (!mqtt.connected()) {
    attempts++;
    Serial.printf("Connecting MQTT... (attempt %d)\n", attempts);
    String clientId = "ESP32_Drone_" + String(random(0xffff), HEX);
    if (mqtt.connect(clientId.c_str(), mqtt_user, mqtt_pass)) {
      Serial.println("MQTT Connected!");
      mqtt.subscribe(topic_in);
    } else {
      Serial.printf("Failed rc=%d\n", mqtt.state());
      net.stop();
      delay(1000);
      net.setInsecure();
      delay(5000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  delay(500);

  Serial1.begin(115200, SERIAL_8N1, RX_PIN, TX_PIN);

  WiFiManager wm;
  // wm.resetSettings();
  wm.setConnectTimeout(20);
  wm.autoConnect("DroneSetup", "12345678");

  Serial.println("WiFi connected! IP: " + WiFi.localIP().toString());

  WiFi.config(
    WiFi.localIP(), WiFi.gatewayIP(), WiFi.subnetMask(),
    IPAddress(8,8,8,8), IPAddress(8,8,4,4)
  );
  delay(1000);

  if (MDNS.begin("drone")) {
    Serial.println("mDNS: drone.local:8888");
  }

  tcpServer.begin();
  Serial.printf("TCP Server: %s:%d\n", WiFi.localIP().toString().c_str(), tcp_port);

  connectMQTT();
}

void loop() {
  // --- MQTT: non-blocking reconnect ---
  if (!mqtt.connected()) {
    if (millis() - lastMqttAttempt > 5000) {
      lastMqttAttempt = millis();
      Serial.println("Reconnecting MQTT...");
      net.stop();
      delay(100);
      net.setInsecure();
      String clientId = "ESP32_Drone_" + String(random(0xffff), HEX);
      if (mqtt.connect(clientId.c_str(), mqtt_user, mqtt_pass)) {
        Serial.println("MQTT Connected!");
        mqtt.subscribe(topic_in);
      } else {
        Serial.printf("Failed rc=%d\n", mqtt.state());
      }
    }
  } else {
    mqtt.loop();
  }

  // --- RC State Machine ---
  bool tcpActive = tcpClient && tcpClient.connected();

  if (isMotorRunning && millis() - lastMspRcTime > 100) {
    lastMspRcTime = millis();

    if (motorState == 1) {
      // ARMING: throttle thấp + AUX1=1800
      sendRcPacket(1000, 1800);
      sendMspPacket(151, NULL, 0); // MSP_ARM
      if (millis() - armStartTime > 1500) {
        motorState = 2;
        Serial.println("[MSP] Armed! Ramping throttle...");
      }
    } else if (motorState == 2) {
      // FLYING: throttle thật + AUX1=1800
      sendRcPacket((uint16_t)motorThrottle, 1800);
    }

  } else if (!isMotorRunning && !tcpActive && millis() - lastMspRcTime > 500) {
    // Idle + không có Configurator → giữ disarm nhẹ
    lastMspRcTime = millis();
    sendRcPacket(1000, 1000);
  }

  // --- TCP Client ---
  if (!tcpActive) {
    WiFiClient newClient = tcpServer.available();
    if (newClient) {
      tcpClient = newClient;
      Serial.println(">>> TCP connected: " + tcpClient.remoteIP().toString());
      if (fcPreLen > 0) {
        tcpClient.write(fcPreBuffer, fcPreLen);
        Serial.printf(">>> Pre-buffer: %d bytes sent\n", fcPreLen);
        fcPreLen = 0;
      }
    }
  }

  // TCP (Configurator) -> FC
  if (tcpActive) {
    while (tcpClient.available()) {
      uint8_t b = tcpClient.read();
      Serial1.write(b);
      Serial.printf("TCP->FC: 0x%02X\n", b);
    }
  }

  // FC -> MQTT + TCP
  while (Serial1.available()) {
    uint8_t b = Serial1.read();

    if (tcpActive) {
      tcpClient.write(b);
    } else {
      if (fcPreLen < 512) fcPreBuffer[fcPreLen++] = b;
    }

    if (fcLen < 256) fcBuffer[fcLen++] = b;
  }

  // Publish MSP binary lên topic_out
  if (fcLen > 0 && millis() - lastPublish > 20) {
    if (mqtt.connected()) {
      mqtt.publish(topic_out, fcBuffer, fcLen);
    }
    fcLen = 0;
    lastPublish = millis();
  }

  // Publish JSON telemetry mỗi 2 giây
  if (millis() - lastJsonTelemetry > 2000) {
    lastJsonTelemetry = millis();
    if (mqtt.connected()) {
      StaticJsonDocument<200> doc;
      doc["id"]       = "Drone-01";
      doc["role"]     = isMotorRunning ? "FLYING" : "IDLE";
      doc["status"]   = isMotorRunning ? "FLYING" : "IDLE";
      doc["lat"]      = 10.762622;
      doc["lng"]      = 106.660172;
      doc["alt"]      = 0;
      doc["throttle"] = motorThrottle;
      doc["state"]    = motorState;

      char jsonBuffer[256];
      serializeJson(doc, jsonBuffer);
      mqtt.publish(topic_telemetry, jsonBuffer);
    }
  }
}