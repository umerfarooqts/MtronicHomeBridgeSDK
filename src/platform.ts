import fs from 'fs';
import mqtt, { MqttClient } from 'mqtt';
import { API, DynamicPlatformPlugin, Logging, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings.js';
import { MtronicPlatformAccessory } from './platformAccessory.js';


import { commandTypes, stateTypes, defaultStatesForDevices, DevicesObjectType, DeviceType, generateRandomID, batteryTypes, defaultBatteryForDevices, acceptedTopic, rejectedTopic, getAllDevicesTopic } from './utils/index.js';



/**
 * HomebridgePlatform
 * This class is the main constructor for your plugin, this is where you should
 * parse the user config and discover/register accessories with Homebridge.
 */
export class MtronicHomebridgePlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service;
  public readonly Characteristic: typeof Characteristic;

  // this is used to track restored cached accessories
  public accessories: PlatformAccessory[] = [];

  // MQTT client
  private mqttClient!: MqttClient;

  constructor(
    public readonly log: Logging,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.Service = api.hap.Service;
    this.Characteristic = api.hap.Characteristic;

    this.log.debug('Finished initializing platform:', this.config.name);


    // Homebridge 1.8.0 introduced a `log.success` method that can be used to log success messages
    // For users that are on a version prior to 1.8.0, we need a 'polyfill' for this method
    if (!log.success) {
      log.success = log.info;
    }


    // When this event is fired it means Homebridge has restored all cached accessories from disk.
    // Dynamic Platform plugins should only register new accessories after this event was fired,
    // in order to ensure they weren't added to homebridge already. This event can also be used
    // to start discovery of new accessories.
    this.api.on('didFinishLaunching', () => {
      log.debug('Executed didFinishLaunching callback');
      // run the method to discover / register your devices as accessories

      const brokerUrl = this.config.brokerUrl
      const caPath = this.config.ca_path
      const keyPath = this.config.client_key_path
      const certPath = this.config.client_cert_path

      // certificates for authentication
      const ca = fs.readFileSync(caPath)
      const key = fs.readFileSync(keyPath)
      const cert = fs.readFileSync(certPath)


      if (brokerUrl) {
        const options = {
          ca: ca,
          key: key,
          cert: cert,
          rejectUnauthorized: false, // Ensure the server certificate is valid
        };


        // need to add a condition to check if brokerURL exists only then attempt to connect
        // Initialize MQTT client
        this.mqttClient = mqtt.connect(brokerUrl, options); // Replace with your MQTT broker URL

        this.mqttClient.on('error', (e: any) => {
          this.log.info(`${JSON.stringify(e)}`)
        })

        this.mqttClient.on('connect', () => {
          this.log.info('Connected to MQTT broker', brokerUrl);
          this.subscribeToTopics();
        });

        this.mqttClient.on('message', (topic, message) => {
          this.handleMqttMessage(topic, message);
        });

        this.mqttClient.publish(getAllDevicesTopic(this.config.mhubId), JSON.stringify({
          metadata: {
            ts: new Date().getTime(),
            mhub_id: this.config.mhubId,
            request_id: generateRandomID(),
            cmd: commandTypes.getAllAccesories,
          }
        }))
        // do not need this function, since we will discover devices from topic message
        // discover devices from cache with there properties
        this.discoverDevices();
      }
    });
  }

  /**
   * This function is invoked when homebridge restores cached accessories from disk at startup.
   * It should be used to set up event handlers for characteristics and update respective values.
   */
  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);

    // add the restored accessory to the accessories cache, so we can track if it has already been registered
    this.accessories.push(accessory);
  }

  /**
 * This function is invoked when homebridge deletes a cached accessories from disk.
 * It should be used to set up event handlers for characteristics and update respective values.
 */
  unConfigureAccessory(accessory: PlatformAccessory) {
    const newAccessories = this.accessories.filter(item => item.UUID !== accessory.UUID)
    this.accessories = newAccessories
    // remove the accessory from cach
  }

  /**
 * This is an example method showing how to register discovered accessories.
 * Accessories must only be registered once, previously created accessories
 * must not be registered again to prevent "duplicate UUID" errors.
 */
  async discoverDevices() {
    this.log.info(`accesories on startup ${this.accessories}`)

    // will use this method to recover devices from cache and register based on their types
    for (const accessory of this.accessories) {
      this.log.info(`Restoring device ${accessory.context.device.type} from cache`);
      this.createAccessoryHandler(accessory)
    }
  }

  getStateOfDevice = (stateOfDevice: stateTypes, type: string) => {
    if (stateOfDevice === null || stateOfDevice === undefined) {
      return defaultStatesForDevices[type]
    }
    return stateOfDevice
  }

  getBatteryState = (batteryOfDevice: batteryTypes) => {
    if (batteryOfDevice === null || batteryOfDevice === undefined) {
      return defaultBatteryForDevices
    }
    return batteryOfDevice
  }


  convertObjectToArray(devices: DevicesObjectType) {
    // Convert devices object to an array
    const devicesArray: DeviceType[] = Object.keys(devices).map(key => {
      const [uniqueId, type] = key.split('-'); // Split the key into uniqueId and type
      return {
        uniqueId,
        type,
        displayName: devices[key].n,
        s: this.getStateOfDevice(devices[key].s, type),
        b: this.getBatteryState(devices[key].b)
      };
    });

    return devicesArray;
  }

  handleAccesoryRegistration(parsedData: any, attributeKey: string) {
    let devicesObject = parsedData[attributeKey]

    const devices = this.convertObjectToArray(devicesObject)


    if (Array.isArray(devices)) {
      for (const device of devices) {
        this.log.info(`single device ${device}`);

        // generate a unique id for the accessory this should be generated from
        // something globally unique, but constant, for example, the device serial
        // number or MAC address
        const uuid = this.api.hap.uuid.generate(device?.uniqueId);

        // see if an accessory with the same uuid has already been registered and restored from
        // the cached devices we stored in the `configureAccessory` method above
        const existingAccessory = this.accessories.find(
          (accessory) => accessory.UUID === uuid,
        );

        if (existingAccessory) {
          // the accessory already exists
          this.log.info(
            'Restoring existing accessory from cache:',
            existingAccessory.displayName,
          );

          // adding accessory to to accessories array for realtime update first time
          this.configureAccessory(existingAccessory)

          // if you need to update the accessory.context then you should run `api.updatePlatformAccessories`. e.g.:
          // existingAccessory.context.device = device;
          // this.api.updatePlatformAccessories([existingAccessory]);

          // create the accessory handler for the restored accessory
          // this is imported from `platformAccessory.ts`
          this.createAccessoryHandler(existingAccessory);

          // it is possible to remove platform accessories at any time using `api.unregisterPlatformAccessories`, e.g.:
          // remove platform accessories when no longer present
          // this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [existingAccessory]);
          // this.log.info('Removing existing accessory from cache:', existingAccessory.displayName);
        } else {
          // the accessory does not yet exist, so we need to create it
          this.log.info('Adding new accessory:', device?.displayName);

          // create a new accessory
          const accessory = new this.api.platformAccessory(device?.displayName, uuid);

          // store a copy of the device object in the `accessory.context`
          // the `context` property can be used to store any data about the accessory you may need
          accessory.context.device = device;

          // adding accessory to to accessories array for realtime update first time
          this.configureAccessory(accessory)

          // create the accessory handler for the newly created accessory
          // this is imported from `platformAccessory.ts`
          this.createAccessoryHandler(accessory);

          // link the accessory to your platform
          this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [
            accessory,
          ]);
        }
      }
    }
  }




  /**
   * Handle incoming MQTT messages.
   */
  handleMqttMessage(topic: string, message: Buffer) {

    this.log.info(`Received message from topic ${topic}: ${message} ${typeof message}`);

    if (topic === acceptedTopic(this.config.mhubId)) { // Replace with your topic
      let parsedData = JSON.parse(message.toString());

      if (parsedData.metadata.cmd === commandTypes.addAllAccesories) {
        for (const existingAccessory of this.accessories) {

          // adding accessory to to accessories array for realtime update first time
          this.unConfigureAccessory(existingAccessory)

          // it is possible to remove platform accessories at any time using `api.unregisterPlatformAccessories`, e.g.:
          // remove platform accessories when no longer present
          this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [existingAccessory]);
          this.log.info('Removing existing accessory from cache:', existingAccessory.displayName);

        }
        this.log.info(`accessory after removal: ${this.accessories}`)
        this.handleAccesoryRegistration(parsedData, 'devices')
      }
      // add new accesories
      if (parsedData.metadata.cmd === commandTypes.addAccessories) {
        let data = JSON.stringify(parsedData, null, 2)

        this.log.info(`devices ${data}`)
        this.handleAccesoryRegistration(parsedData, 'device')
      }

      // update added accesories
      if (parsedData.metadata.cmd === commandTypes.updateAccessories) {
        const updateDeviceObject = parsedData.state;

        const updatedDevices = this.convertObjectToArray(updateDeviceObject)
        // Handle device state updates

        if (Array.isArray(updatedDevices)) {
          for (const device of updatedDevices) {
            const uuid = this.api.hap.uuid.generate(device.uniqueId);
            const existingAccessory = this.accessories.find(
              (accessory) => accessory.UUID === uuid,
            );

            this.log.info(`existing device update ${existingAccessory}`)

            if (existingAccessory) {
              this.log.info(
                'Updating accessory state:',
                existingAccessory.displayName,
              );
              existingAccessory.context.device.s = device.s;

              // Update the accessory characteristics here
              const mtronicPlatformAccessory =
                this.getAccessoryHandler(existingAccessory);
              mtronicPlatformAccessory.updateCharacteristics(device);
            }
          }
        }
      }

      // remove deleted accesories 
      if (parsedData.metadata.cmd === commandTypes.removeAccessories) {
        // remove devices from cache and unregister incase device is deleted

        const devices = parsedData.device

        if (Array.isArray(devices)) {
          // loop over the discovered devices and register each one if it has not already been registered
          for (const device of devices) {
            const [uniqueId] = device.split('-')
            this.log.info(`single device ${device}`);

            // generate a unique id for the accessory this should be generated from
            // something globally unique, but constant, for example, the device serial
            // number or MAC address
            const uuid = this.api.hap.uuid.generate(uniqueId);

            // see if an accessory with the same uuid has already been registered and restored from
            // the cached devices we stored in the `configureAccessory` method above
            const existingAccessory = this.accessories.find(
              (accessory) => accessory.UUID === uuid,
            );

            if (existingAccessory) {
              // adding accessory to to accessories array for realtime update first time
              this.unConfigureAccessory(existingAccessory)

              // it is possible to remove platform accessories at any time using `api.unregisterPlatformAccessories`, e.g.:
              // remove platform accessories when no longer present
              this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [existingAccessory]);
              this.log.info('Removing existing accessory from cache:', existingAccessory.displayName);
            }
          }
        }
      }

    }
  }

  private createAccessoryHandler(accessory: PlatformAccessory) {
    return new MtronicPlatformAccessory(this, accessory, this.mqttClient);
  }

  private getAccessoryHandler(accessory: PlatformAccessory) {
    return new MtronicPlatformAccessory(this, accessory, this.mqttClient);
  }

  private subscribeToTopics() {
    this.mqttClient.subscribe(acceptedTopic(this.config.mhubId))
    this.mqttClient.subscribe(rejectedTopic(this.config.mhubId))
  }

}