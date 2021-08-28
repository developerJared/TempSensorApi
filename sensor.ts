import {db} from "./db";

export interface ISensor {
    name: string;
    getHistory(lastMinutes?: number): ISensorData[];
    saveTemperature(temperature: number, timestamp: number, type: string): ISensorData;
}

export interface ISensorData {
    cid?: number;
    name: string;
    temperature: number;
    created: number;
    updated: number;
    $created?: number;
    $updated?: number;
}

export class Sensor implements ISensor {
    constructor(public name: string) {

    }

    public getHistory(lastMinutes: number = 30) {
        return db.Instance.getHistory(this.name ,lastMinutes);
    }

    public saveTemperature(temperature: number, timestamp: number, type: string): ISensorData {
        console.log("[Temperature] -> [%s] -> %s", this.name, temperature);
        let sensorData = {
            name: this.name,
            temperature: temperature,
            type: type,
            created: timestamp,
            updated: timestamp
        };
        return db.Instance.saveSensorData(sensorData);
    }
}