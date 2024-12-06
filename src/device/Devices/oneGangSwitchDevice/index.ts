import { MqttClient } from 'mqtt';
import { PlatformAccessory } from 'homebridge';

import { Switch } from '../../generic/singleSwitch/index.js';
import { BaseDevice } from '../../generic/baseDevice/index.js';

import { MtronicHomebridgePlatform } from '../../../platform.js';


export class OneGangSwitchDevice extends BaseDevice {
    private switch!: Switch;

    constructor(
        platform: MtronicHomebridgePlatform,
        accessory: PlatformAccessory,
        mqttClient: MqttClient
    ) {
        super(platform, accessory, mqttClient);
        this.initialize();
    }

    initialize(): void {
        this.switch = new Switch(
            this.platform,
            this.accessory,
            this.mqttClient,
            `${this.accessory.context.device.displayName}`,
            'switch',
            0, // Bit index for the first switch
            1
        );
    }

    updateCharacteristics(deviceState: any): void {
        this.platform.log.info(`deviceState ${JSON.stringify(deviceState)}`);
        if (deviceState.s && Array.isArray(deviceState.s) && deviceState.s.length > 1) {
            const switchState = (deviceState.s[1] & (1 << 0)) > 0; // Check the bit at index 0
            this.switch.updateCharacteristic(switchState);
        }
    }
}
