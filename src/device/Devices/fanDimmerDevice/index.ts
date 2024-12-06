
import { MqttClient } from 'mqtt';
import { PlatformAccessory } from 'homebridge';

import { BaseDevice } from '../../generic/baseDevice/index.js';

import { MtronicHomebridgePlatform } from '../../../platform.js';
import { commandTypes, deviceUpdateTopic, generateRandomID } from '../../../utils/index.js';



export class FanDevice extends BaseDevice {
    private fanService: any;

    constructor(
        platform: MtronicHomebridgePlatform,
        accessory: PlatformAccessory,
        mqttClient: MqttClient
    ) {
        super(platform, accessory, mqttClient);
        this.initialize();
    }

    initialize(): void {
        this.fanService = this.accessory.getService(this.platform.Service.Fanv2)
            || this.accessory.addService(this.platform.Service.Fanv2, `${this.accessory.context.device.displayName}`);

        this.fanService.getCharacteristic(this.platform.Characteristic.Active)
            .onSet(this.setActive.bind(this))
            .onGet(this.getActive.bind(this));

        this.fanService.getCharacteristic(this.platform.Characteristic.RotationSpeed)
            .onSet(this.setRotationSpeed.bind(this))
            .onGet(this.getRotationSpeed.bind(this));
    }

    async setActive(value: number) {
        const isOn = value === 1;
        this.accessory.context.device.s[1] = isOn ? 1 : 0;

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
                    s: this.accessory.context.device.s,
                }
            }
        });
        this.mqttClient.publish(topic, message);

        this.platform.log.debug(`Set Fan Active ->`, isOn);
    }

    async getActive(): Promise<number> {
        const isOn = this.accessory.context.device.s[1];
        this.platform.log.debug(`Get Fan Active ->`, isOn);
        return isOn === 1 ? 1 : 0;
    }

    async setRotationSpeed(value: number) {
        const speedLevel = Math.ceil(value / 16.67); // Convert 0-100 range to 1-6 level
        this.accessory.context.device.s[0] = speedLevel;

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
                    s: this.accessory.context.device.s,
                }
            }
        });
        this.mqttClient.publish(topic, message);

        this.platform.log.debug(`Set Fan Rotation Speed ->`, speedLevel);
    }

    async getRotationSpeed(): Promise<number> {
        const speedLevel = this.accessory.context.device.s[0];
        const rotationSpeed = speedLevel * 16.67; // Convert 1-6 level to 0-100 range
        this.platform.log.debug(`Get Fan Rotation Speed ->`, rotationSpeed);
        return rotationSpeed;
    }

    updateCharacteristics(deviceState: any): void {
        if (deviceState.s[1] !== undefined) {
            this.fanService.updateCharacteristic(this.platform.Characteristic.Active, deviceState.s[1] ? 1 : 0);
        }
        if (deviceState.s[0] !== undefined) {
            const rotationSpeed = deviceState.s[0] * 16.67;
            this.fanService.updateCharacteristic(this.platform.Characteristic.RotationSpeed, rotationSpeed);
        }
    }
}
