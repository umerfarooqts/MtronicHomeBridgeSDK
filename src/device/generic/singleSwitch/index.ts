import { MqttClient } from 'mqtt';

import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';

import { MtronicHomebridgePlatform } from '../../../platform.js';
import { commandTypes, convertDecimalToBinary, deviceUpdateTopic, generateRandomID } from '../../../utils/index.js';

export class Switch {
    private service: Service;
    private readonly numberOfSwitches: number;

    constructor(
        private readonly platform: MtronicHomebridgePlatform,
        private readonly accessory: PlatformAccessory,
        private readonly mqttClient: MqttClient,
        private readonly name: string,
        private readonly subtype: string,
        private readonly bitIndex: number, // Bit index for this switch
        numberOfSwitches?: number // Number of switches this master switch controls
    ) {
        this.service = this.accessory.getService(name)
            || this.accessory.addService(this.platform.Service.Switch, name, subtype);

        this.service.setCharacteristic(this.platform.Characteristic.Name, name);

        // binding custom on/off functions with switch device
        this.service.getCharacteristic(this.platform.Characteristic.On)
            .onSet(this.setOn.bind(this))
            .onGet(this.getOn.bind(this));

        // If the number of switches is not provided, set it to 1
        this.numberOfSwitches = numberOfSwitches ?? 1;
    }

    stateToPublish(stateOfDevice: number) {
        const switchNumber = this.bitIndex === -1 ? 255 : this.bitIndex
        return [switchNumber, stateOfDevice]
    }

    async setOn(value: CharacteristicValue) {
        const state = this.accessory.context.device.s;
        this.platform.log(state, 'stateOfDevice')
        // if state(s) is an array and has length greater than 1, since we will have the first index of array and we use it as device state
        if (Array.isArray(state) && state.length > 1) {
            let currentState = state[1];
            let binaryState = convertDecimalToBinary(currentState)

            // bitIndex would be -1 for master control
            // bitIndex greater than 1 is for every switch of device (example : bitIndex = 2 thrid switch of a 3G)
            if (this.bitIndex >= 0) {
                // Individual switch
                binaryState[this.bitIndex] = value ? '1' : '0';
            } else {
                // Master switch
                const masterValue = value as boolean;
                // looping through states according to number of switches, for example for a 3G device we have 3 switches that correspond to state of master switch
                for (let i = 0; i < this.numberOfSwitches; i++) {
                    binaryState[i] = masterValue ? '1' : '0';
                }
            }

            currentState = parseInt(binaryState.reverse().join(''), 2);
            state[1] = currentState;

            // Publish the state update to MQTT
            this.platform.log(`platformConfig ${this.platform.config.mhubId}`)
            const topic = deviceUpdateTopic(this.platform.config.mhubId)
            const message = JSON.stringify({
                metadata: {
                    topic,
                    ts: new Date().getTime(),
                    request_id: generateRandomID(),
                    cmd: commandTypes.updateAccessories,
                    mhub_id: this.platform.config.mhubId,
                    node_id: this.accessory.context.device.uniqueId,
                },
                state: {
                    [`${this.accessory.context.device.uniqueId}-${this.accessory.context.device.type}`]: {
                        s: this.stateToPublish(state[1]),
                    }
                }
            });

            this.platform.log(`message to publish = ${message}`)
            this.mqttClient.publish(topic, message);

            this.platform.log.debug(`Set ${this.name} Characteristic On ->`, value);
        }
    }

    async getOn(): Promise<CharacteristicValue> {
        const state = this.accessory.context.device.s;
        if (Array.isArray(state) && state.length > 1) {
            const currentState = state[1];
            const binaryState = convertDecimalToBinary(currentState)

            // bitIndex would be -1 for master control
            // bitIndex greater than 1 is for every switch of device (example : bitIndex = 2 thrid switch of a 3G)
            if (this.bitIndex >= 0) {
                const isOn = binaryState[this.bitIndex] === '1';
                this.platform.log.debug(`Get ${this.name} Characteristic On ->`, isOn);
                return isOn;
            } else {
                // Master switch is on if all individual switches are on
                const isOn = binaryState.slice(0, this.numberOfSwitches).every((bit: any) => bit === '1');
                this.platform.log.debug(`Get ${this.name} Characteristic On ->`, isOn);
                return isOn;
            }
        }
        return false;
    }

    updateCharacteristic(value: boolean): void {
        this.service.updateCharacteristic(this.platform.Characteristic.On, value);
        this.platform.log.debug(`Updated ${this.name} Characteristic On ->`, value);
    }
}
