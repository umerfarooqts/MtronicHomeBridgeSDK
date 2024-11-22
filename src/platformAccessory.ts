import { PlatformAccessory } from 'homebridge';
import { MtronicHomebridgePlatform } from './platform.js';
import { DeviceFactory } from './device/deviceFactory.js';
import { BaseDevice } from './device/generic/baseDevice/index.js';
import { MqttClient } from 'mqtt';


/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers.
 * Each accessory may expose multiple services of different service types.
 */
export class MtronicPlatformAccessory {
  private device: BaseDevice;

  constructor(
    private readonly platform: MtronicHomebridgePlatform,
    private readonly accessory: PlatformAccessory,
    private readonly mqttClient: MqttClient
  ) {
    // Create the device based on the type
    this.device = DeviceFactory.createDevice(platform, accessory, mqttClient);
  }

  /**
   * Update the characteristics of the accessory based on the device state
   */
  updateCharacteristics(deviceState: any) {
    this.device.updateCharacteristics(deviceState);
  }
}
