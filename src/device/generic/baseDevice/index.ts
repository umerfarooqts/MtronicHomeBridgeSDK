import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';
import { MtronicHomebridgePlatform } from '../../../platform.js';
import { MqttClient } from 'mqtt/*';

export abstract class BaseDevice {
    protected service!: Service;

    constructor(
        protected readonly platform: MtronicHomebridgePlatform,
        protected readonly accessory: PlatformAccessory,
        protected readonly mqttClient: MqttClient
    ) {
        // set accessory information
        this.accessory.getService(this.platform.Service.AccessoryInformation)!
            .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Default-Manufacturer')
            .setCharacteristic(this.platform.Characteristic.Model, 'Default-Model')
            .setCharacteristic(this.platform.Characteristic.SerialNumber, 'Default-Serial');
    }

    abstract initialize(): void;

    abstract updateCharacteristics(deviceState: any): void;
}
