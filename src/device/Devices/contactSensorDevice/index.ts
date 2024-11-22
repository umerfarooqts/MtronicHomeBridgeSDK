import { MqttClient } from 'mqtt';
import { PlatformAccessory, Service } from 'homebridge';

import { BaseDevice } from '../../generic/baseDevice/index.js';
import { MtronicHomebridgePlatform } from '../../../platform.js';

export class ContactSensorDevice extends BaseDevice {
    private contactSensorService!: Service;
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
        // Initialize the Contact Sensor service
        this.contactSensorService = this.accessory.getService(this.platform.Service.ContactSensor)
            || this.accessory.addService(this.platform.Service.ContactSensor, `${this.accessory.context.device.displayName}`);

        this.contactSensorService.getCharacteristic(this.platform.Characteristic.ContactSensorState)
            .onGet(this.getContactSensorState.bind(this));

        // Initialize the Battery service
        this.batteryService = this.accessory.getService(this.platform.Service.Battery)
            || this.accessory.addService(this.platform.Service.Battery, `${this.accessory.context.device.displayName} Battery`);

        this.batteryService.getCharacteristic(this.platform.Characteristic.BatteryLevel)
            .onGet(this.getBatteryLevel.bind(this));

        this.batteryService.getCharacteristic(this.platform.Characteristic.StatusLowBattery)
            .onGet(this.getStatusLowBattery.bind(this));
    }

    async getContactSensorState(): Promise<number> {
        const isOpen = this.accessory.context.device.s === 1;
        this.platform.log.debug(`Get Contact Sensor State ->`, isOpen);
        return isOpen ? this.platform.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED
            : this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED;
    }

    async getBatteryLevel(): Promise<number> {
        const batteryLevel = this.accessory.context.device.b;
        this.platform.log.debug(`Get Battery Level ->`, batteryLevel);
        return batteryLevel;
    }

    async getStatusLowBattery(): Promise<number> {
        const batteryLevel = this.accessory.context.device.b;
        const isLowBattery = batteryLevel < 20; // Assuming battery level below 20% is considered low
        this.platform.log.debug(`Get Status Low Battery ->`, isLowBattery);
        return isLowBattery ? this.platform.Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW
            : this.platform.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;
    }

    updateCharacteristics(deviceState: any): void {
        if (deviceState.s !== undefined) {
            const contactSensorState = deviceState.s === 1
                ? this.platform.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED
                : this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED;
            this.contactSensorService.updateCharacteristic(this.platform.Characteristic.ContactSensorState, contactSensorState);
        }
        if (deviceState.b !== undefined) {
            this.batteryService.updateCharacteristic(this.platform.Characteristic.BatteryLevel, deviceState.b);

            const statusLowBattery = deviceState.b < 20
                ? this.platform.Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW
                : this.platform.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;
            this.batteryService.updateCharacteristic(this.platform.Characteristic.StatusLowBattery, statusLowBattery);
        }
    }
}
