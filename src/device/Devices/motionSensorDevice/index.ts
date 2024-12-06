import { MqttClient } from 'mqtt';
import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';

import { BaseDevice } from '../../generic/baseDevice/index.js';
import { MtronicHomebridgePlatform } from '../../../platform.js';


export class MotionSensorDevice extends BaseDevice {
    private motionService!: Service;
    private batteryService!: Service;

    constructor(
        platform: MtronicHomebridgePlatform,
        accessory: PlatformAccessory,
        mqttClient: MqttClient
    ) {
        super(platform, accessory, mqttClient);
        this.initialize();
    }

    initialize(): void {
        // Initialize Motion Sensor service
        this.motionService = this.accessory.getService(this.platform.Service.MotionSensor)
            || this.accessory.addService(this.platform.Service.MotionSensor, this.accessory.context.device.displayName);

        this.motionService.getCharacteristic(this.platform.Characteristic.MotionDetected)
            .onGet(this.getMotionDetected.bind(this));

        // Initialize Battery Service
        this.batteryService = this.accessory.getService(this.platform.Service.Battery)
            || this.accessory.addService(this.platform.Service.Battery, `${this.accessory.context.device.displayName} Battery`);

        this.batteryService.getCharacteristic(this.platform.Characteristic.BatteryLevel)
            .onGet(this.getBatteryLevel.bind(this));

        this.batteryService.getCharacteristic(this.platform.Characteristic.StatusLowBattery)
            .onGet(this.getStatusLowBattery.bind(this));
    }

    updateCharacteristics(deviceState: any): void {
        this.platform.log.info(`Updating Motion Sensor characteristics: ${deviceState}`);

        if (deviceState.s !== undefined && deviceState.s !== undefined) {
            const motionDetected = deviceState.s > 0;
            this.motionService.updateCharacteristic(this.platform.Characteristic.MotionDetected, motionDetected);
        }

        if (deviceState.b !== undefined) {
            const batteryLevel = deviceState.b;
            const lowBattery = batteryLevel < 20 ? this.platform.Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW : this.platform.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;

            this.batteryService.updateCharacteristic(this.platform.Characteristic.BatteryLevel, batteryLevel);
            this.batteryService.updateCharacteristic(this.platform.Characteristic.StatusLowBattery, lowBattery);
        }
    }

    private async getMotionDetected(): Promise<CharacteristicValue> {
        const isMotionDetected = this.accessory.context.device.s > 0;
        this.platform.log.debug(`Get Motion Detected ->`, isMotionDetected);
        return isMotionDetected;
    }

    private async getBatteryLevel(): Promise<CharacteristicValue> {
        const batteryLevel = this.accessory.context.device.b;
        this.platform.log.debug(`Get Battery Level ->`, batteryLevel);
        return batteryLevel;
    }

    private async getStatusLowBattery(): Promise<CharacteristicValue> {
        const batteryLevel = this.accessory.context.device.b;
        const lowBattery = batteryLevel < 20 ? this.platform.Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW : this.platform.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;
        this.platform.log.debug(`Get Status Low Battery ->`, lowBattery);
        return lowBattery;
    }
}
