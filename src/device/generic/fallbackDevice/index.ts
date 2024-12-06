import { BaseDevice } from "../baseDevice/index.js";

export class FallbackDevice extends BaseDevice {
    // Define a simple fallback device that logs unsupported actions
    initialize(): void {
        this.platform.log.warn(`Initializing fallback device for unsupported type: ${this.accessory.context.device.type}`);
    }

    updateCharacteristics(deviceState: any): void {
        this.platform.log.warn(`Attempting to update characteristics for unsupported device type: ${this.accessory.context.device.type}`);
    }
}