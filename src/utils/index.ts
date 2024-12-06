import { randomBytes } from "crypto";

type CommandTypes = {
    addAccessories: string,
    getAllAccesories: string,
    addAllAccesories: string,
    updateAccessories: string,
    removeAccessories: string,
};

export type stateTypes = number[] | string | number | null

export type batteryTypes = number | string | number | null

// known device types
type DeviceTypes = {
    oneG: string,
    twoG: string,
    fourG: string
    threeG: string,
    smartPlug: string,
    fanDimmer: string,
    powerPanel: string,
    smartRelay: string,
    fourInchLCD: string,
    motionSensor: string,
    contactSensor: string,
    temperatureSensor: string
}

export interface DeviceType {
    s: any;
    type: string;
    uniqueId: string;
    displayName: string;
}

export interface DevicesObjectType {
    [key: string]: {
        n: string;
        s: stateTypes;
        b: batteryTypes
    };
}



export const commandTypes: CommandTypes = {
    updateAccessories: "state",
    addAccessories: 'addDevice',
    addAllAccesories: "addDevices",
    getAllAccesories: 'getDevices',
    removeAccessories: 'deleteDevice',

};

export const deviceTypes: DeviceTypes = {
    oneG: '1G',
    twoG: '2G',
    fourG: '4G',
    threeG: '3G',
    fanDimmer: 'FD',
    smartPlug: 'SP',
    smartRelay: 'SR',
    powerPanel: 'PP',
    fourInchLCD: '4P',
    motionSensor: 'MS',
    contactSensor: 'CS',
    temperatureSensor: "TS"
}

export const convertDecimalToBinary = (valueToConvert: number) => valueToConvert.toString(2).padStart(8, '0').split('').reverse()

export const generateRandomID = (): string => randomBytes(3).toString('hex');

// topics
export const acceptedTopic = (mhubId: string) => `mha/v1/${mhubId}/accepted`
export const rejectedTopic = (mhubId: string) => `mha/v1/${mhubId}/rejected`
export const getAllDevicesTopic = (mhubId: string) => `mha/v1/${mhubId}/devices/get`
export const deviceUpdateTopic = (mhubId: string) => `mha/v1/${mhubId}/devices/state/set`


const touchPanelsDefault = [0, 0]

export const defaultStatesForDevices: any = {
    'CS': 0,
    'MS': 0,
    'TS': { rh: 0, t: 0 },
    '1G': touchPanelsDefault,
    'PP': touchPanelsDefault,
    'SP': touchPanelsDefault,
    '2G': touchPanelsDefault,
    'SR': touchPanelsDefault,
    '3G': touchPanelsDefault,
    '4P': touchPanelsDefault,
    '4G': touchPanelsDefault,
    'FD': touchPanelsDefault,
}

export const defaultBatteryForDevices = 100