import { MqttClient } from 'mqtt';
import { PlatformAccessory } from 'homebridge';

import { Switch } from '../../generic/singleSwitch/index.js';
import { BaseDevice } from '../../generic/baseDevice/index.js';

import { MtronicHomebridgePlatform } from '../../../platform.js';
import { convertDecimalToBinary } from '../../../utils/index.js';

export class TwoGangSwitchDevice extends BaseDevice {
    private switch1!: Switch;
    private switch2!: Switch;
    private masterSwitch!: Switch;

    constructor(
        platform: MtronicHomebridgePlatform,
        accessory: PlatformAccessory,
        mqttClient: MqttClient
    ) {
        super(platform, accessory, mqttClient);
        this.initialize();
    }

    initialize(): void {
        this.switch1 = new Switch(
            this.platform,
            this.accessory,
            this.mqttClient,
            `${this.accessory.context.device.displayName} Switch 1`,
            'switch1',
            0 // Bit index for the first switch
        );

        this.switch2 = new Switch(
            this.platform,
            this.accessory,
            this.mqttClient,
            `${this.accessory.context.device.displayName} Switch 2`,
            'switch2',
            1 // Bit index for the second switch
        );

        this.masterSwitch = new Switch(
            this.platform,
            this.accessory,
            this.mqttClient,
            `${this.accessory.context.device.displayName} Master Switch`,
            'masterSwitch',
            -1, // Special case for master switch, will be handled separately,
            2, // number of switches the master switch control
        );
    }

    updateCharacteristics(deviceState: any): void {
        this.platform.log.info(`deviceState ${JSON.stringify(deviceState)}`);
        if (deviceState.s && Array.isArray(deviceState.s) && deviceState.s.length > 1) {
            const binaryState = convertDecimalToBinary(deviceState.s[1]);

            // Update individual switches
            const switch1State = binaryState[0] === '1';
            const switch2State = binaryState[1] === '1';
            this.switch1.updateCharacteristic(switch1State);
            this.switch2.updateCharacteristic(switch2State);

            // Update master switch
            const masterState = switch1State && switch2State;
            this.masterSwitch.updateCharacteristic(masterState);
        }
    }
}
