import requests
import serial
import struct
import time
import logging
import os
# --- Configuration ---
SERIAL_PORT = "/dev/ttyACM0"
BAUD = 115200
API_URL = "http://localhost:3000"
POLL_INTERVAL = 2  # seconds

# MSP Commands
MSP_STATUS = 101
MSP_SET_WP = 209
MSP_WP = 118
MSP_ARM = 151
MSP_EEPROM_WRITE = 250

# Navigation Action
NAV_WAYPOINT = 1

# --- Setup Logging ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("Bridge")

def build_msp_packet(cmd, payload):
    size = len(payload)
    header = struct.pack('<BBB', size, cmd, 0) # 0 is placeholder for checksum
    
    # Checksum: XOR of size, cmd, and each payload byte
    checksum = size ^ cmd
    for b in payload:
        checksum ^= b
    
    return b'$M<' + struct.pack('<BB', size, cmd) + payload + struct.pack('<B', checksum)

def build_msp_wp(lat_i, lon_i, alt_cm, action=NAV_WAYPOINT):
    """
    INAV Waypoint format:
    - wp_number (uint8) - 1 for single WP overwrite
    - lat (int32)
    - lon (int32)
    - alt (int32)
    - p1, p2, p3 (int16) - 0
    - action (uint8)
    - flag (uint8) - 1 for last WP
    """
    payload = struct.pack('<BiiihhhBB', 
        1,          # WP index 1
        lat_i, 
        lon_i, 
        alt_cm, 
        0, 0, 0,    # p1, p2, p3
        action, 
        0x01        # Flag: 1 = last waypoint
    )
    return build_msp_packet(MSP_SET_WP, payload)

def get_mission():
    try:
        r = requests.get(f"{API_URL}/mission")
        if r.status_code == 200:
            return r.json()
    except Exception as e:
        logger.error(f"Error polling API: {e}")
    return None

def mark_mission_processed():
    try:
        requests.post(f"{API_URL}/mission/processed")
    except Exception as e:
        logger.error(f"Error marking mission processed: {e}")

def read_msp(ser, timeout=1.0):
    """Reads and parses an MSP packet from the serial port."""
    start_time = time.time()
    state = 0 # 0:$, 1:M, 2:<, 3:size, 4:cmd, 5:payload, 6:crc
    size = 0
    cmd = 0
    payload = b''
    crc = 0
    
    while time.time() - start_time < timeout:
        if ser.in_waiting > 0:
            char = ser.read(1)
            if state == 0 and char == b'$': state = 1
            elif state == 1 and char == b'M': state = 2
            elif state == 2:
                if char == b'>': state = 3 # Response
                elif char == b'!': state = -1 # Error
            elif state == 3:
                size = ord(char)
                crc = size
                state = 4
            elif state == 4:
                cmd = ord(char)
                crc ^= cmd
                if size == 0: state = 6
                else: state = 5
            elif state == 5:
                payload += char
                crc ^= ord(char)
                if len(payload) == size: state = 6
            elif state == 6:
                if crc == ord(char):
                    return cmd, payload
                else:
                    logger.error("MSP CRC Error")
                    return None, None
            elif state == -1:
                logger.error("MSP returned Error status (!)")
                return None, None
    return None, None

def wait_for_ack(ser, expected_cmd, timeout=1.0):
    """Wait for a specific MSP command response (ACK)."""
    cmd, payload = read_msp(ser, timeout)
    if cmd == expected_cmd:
        return True
    return False

def main():
    if not os.path.exists(SERIAL_PORT):
        logger.error(f"Device {SERIAL_PORT} not found.")
        return

    try:
        ser = serial.Serial(SERIAL_PORT, BAUD, timeout=0.1)
        logger.info(f"Connected to {SERIAL_PORT} at {BAUD}")
        
        # Test connection by requesting STATUS (101)
        logger.info("Testing connection to INAV...")
        ser.write(build_msp_packet(MSP_STATUS, b''))
        cmd, payload = read_msp(ser)
        if cmd == MSP_STATUS:
            logger.info("Successfully connected to INAV (Status received)")
        else:
            logger.warning("No response from INAV Status request. Check cabling/BAUD.")

        while True:
            mission = get_mission()
            if mission and mission.get('status') == 'pending':
                lat = mission['lat']
                lon = mission['lon']
                alt = mission.get('alt', 20)
                should_arm = mission.get('arm', False)
                
                lat_i = int(lat * 1e7)
                lon_i = int(lon * 1e7)
                alt_cm = int(alt * 100)
                
                logger.info(f"Uploading mission to INAV: Lat={lat}, Lon={lon}, Alt={alt}, Arm={should_arm}")
                
                # 1. Send Waypoint
                wp_packet = build_msp_wp(lat_i, lon_i, alt_cm, wp_index=0)
                ser.write(wp_packet)
                
                if wait_for_ack(ser, MSP_SET_WP):
                    logger.info("INAV Accepted Waypoint #0")
                    
                    # 2. Arm if requested
                    if should_arm:
                        logger.info("Arming drone motors...")
                        ser.write(build_msp_packet(MSP_ARM, b''))
                        if wait_for_ack(ser, MSP_ARM):
                            logger.info("INAV Armed successfully")
                        else:
                            logger.warning("INAV ARM command ignored or failed (Check safety flags in INAV Configurator)")

                    # 3. Save to EEPROM
                    ser.write(build_msp_packet(MSP_EEPROM_WRITE, b''))
                    if wait_for_ack(ser, MSP_EEPROM_WRITE):
                        logger.info("INAV Saved Mission to EEPROM")
                else:
                    logger.error("INAV Rejected Waypoint packet")
                
                mark_mission_processed()
                logger.info("Backend updated.")

            time.sleep(POLL_INTERVAL)

    except serial.SerialException as e:
        logger.error(f"Serial error: {e}")
    except KeyboardInterrupt:
        logger.info("Bridge stopped by user.")
    finally:
        if 'ser' in locals() and ser.is_open:
            ser.close()

if __name__ == "__main__":
    main()
