import { MqttClient } from 'mqtt';
import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';

import { BaseDevice } from '../../generic/baseDevice/index.js';
import { MtronicHomebridgePlatform } from '../../../platform.js';

export class TemperatureSensorDevice extends BaseDevice {
    private temperatureService!: Service;
    private humidityService!: Service;
    private batteryService!: Service;

    constructor(
        platform: MtronicHomebridgePlatform,
        accessory: PlatformAccessory,
        mqttClient: MqttClient,
    ) {
        super(platform, accessory, mqttClient);
        this.initialize();
    }

    initialize(): void {
        // Set up the temperature service
        this.temperatureService = this.accessory.getService(this.platform.Service.TemperatureSensor)
            || this.accessory.addService(this.platform.Service.TemperatureSensor, `${this.accessory.displayName}`);
        this.temperatureService.setCharacteristic(this.platform.Characteristic.Name, `${this.accessory.displayName}`);

        // Set up the humidity service
        this.humidityService = this.accessory.getService(this.platform.Service.HumiditySensor)
            || this.accessory.addService(this.platform.Service.HumiditySensor, `${this.accessory.displayName} Humidity`);
        this.humidityService.setCharacteristic(this.platform.Characteristic.Name, `${this.accessory.displayName} Humidity`);

        // Set up the battery service
        this.batteryService = this.accessory.getService(this.platform.Service.Battery)
            || this.accessory.addService(this.platform.Service.Battery, `${this.accessory.displayName} Battery`);
        this.batteryService.setCharacteristic(this.platform.Characteristic.Name, `${this.accessory.displayName} Battery`);

        // Initialize characteristics
        this.temperatureService.getCharacteristic(this.platform.Characteristic.CurrentTemperature)
            .onGet(this.getCurrentTemperature.bind(this));

        this.humidityService.getCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity)
            .onGet(this.getCurrentHumidity.bind(this));

        this.batteryService.getCharacteristic(this.platform.Characteristic.BatteryLevel)
            .onGet(this.getBatteryLevel.bind(this));
    }


    // Update the characteristics based on device state
    updateCharacteristics(deviceState: any): void {
        if (deviceState.s) {
            const temperature = parseFloat(deviceState?.s?.t);
            const humidity = deviceState?.s?.rh;
            const battery = deviceState?.b;

            this.temperatureService.updateCharacteristic(this.platform.Characteristic.CurrentTemperature, temperature);
            this.humidityService.updateCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity, humidity);
            this.batteryService.updateCharacteristic(this.platform.Characteristic.BatteryLevel, battery);

            this.platform.log.debug(`${this.accessory.displayName} updated - Temperature: ${temperature}, Humidity: ${humidity}, Battery: ${battery}`);
        }
    }

    // Get the current temperature
    private async getCurrentTemperature(): Promise<CharacteristicValue> {
        const temperature = parseFloat(this.accessory.context.device?.s?.t);
        this.platform.log.debug(`${this.accessory.displayName} - Get Current Temperature: ${temperature}`);
        return temperature;
    }

    // Get the current humidity
    private async getCurrentHumidity(): Promise<CharacteristicValue> {
        const humidity = this.accessory.context.device?.s?.rh;
        this.platform.log.debug(`${this.accessory.displayName} - Get Current Humidity: ${humidity}`);
        return humidity;
    }

    // Get the battery level
    private async getBatteryLevel(): Promise<CharacteristicValue> {
        const battery = this.accessory.context?.device?.b;
        this.platform.log.debug(`${this.accessory.displayName} - Get Battery Level: ${battery}`);
        return battery;
    }
}
