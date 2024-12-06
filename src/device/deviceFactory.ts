import { MqttClient } from 'mqtt';
import { PlatformAccessory } from 'homebridge';

// utils
import { deviceTypes } from '../utils/index.js';

// platform
import { MtronicHomebridgePlatform } from '../platform.js';

// generic 
import { BaseDevice } from './generic/baseDevice/index.js';

// fallback device for no recognized device types
import { FallbackDevice } from './generic/fallbackDevice/index.js';


// device classesn
import { FanDevice } from './Devices/fanDimmerDevice/index.js';
import { MotionSensorDevice } from './Devices/motionSensorDevice/index.js';
import { ContactSensorDevice } from './Devices/contactSensorDevice/index.js';
import { OneGangSwitchDevice } from './Devices/oneGangSwitchDevice/index.js';
import { TwoGangSwitchDevice } from './Devices/twoGangSwitchDevice/index.js';
import { FourGangSwitchDevice } from './Devices/fourGangSwitchDevice/index.js';
import { TemperatureSensorDevice } from './Devices/temperatureSensor/index.js';
import { ThreeGangSwitchDevice } from './Devices/threeGangSwitchDevice/index.js';


export class DeviceFactory {
    static createDevice(
        platform: MtronicHomebridgePlatform,
        accessory: PlatformAccessory,
        mqttClient: MqttClient
    ): BaseDevice {
        const deviceType = accessory.context.device.type;

        switch (deviceType) {
            case deviceTypes.fanDimmer:
                return new FanDevice(platform, accessory, mqttClient);
            case deviceTypes.oneG:
            case deviceTypes.smartPlug:
            case deviceTypes.powerPanel:
                return new OneGangSwitchDevice(platform, accessory, mqttClient);
            case deviceTypes.twoG:
            case deviceTypes.smartRelay:
                return new TwoGangSwitchDevice(platform, accessory, mqttClient);
            case deviceTypes.threeG:
            case deviceTypes.fourInchLCD:
                return new ThreeGangSwitchDevice(platform, accessory, mqttClient);
            case deviceTypes.fourG:
                return new FourGangSwitchDevice(platform, accessory, mqttClient);
            case deviceTypes.motionSensor:
                return new MotionSensorDevice(platform, accessory, mqttClient);
            case deviceTypes.contactSensor:
                return new ContactSensorDevice(platform, accessory, mqttClient);
            case deviceTypes.temperatureSensor:
                return new TemperatureSensorDevice(platform, accessory, mqttClient);
            // Add more cases for different device types as needed
            default:
                platform.log.warn(`Unsupported device type: ${deviceType}`);
                return new FallbackDevice(platform, accessory, mqttClient);  // Return a fallback device
        }
    }
}
