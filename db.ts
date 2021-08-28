import * as Promise from 'bluebird';
import {ISensorData} from "./sensor";
import * as moment from 'moment';

let locallydb = require('locallydb');
import * as _ from 'lodash';


export class db {
    public static Instance: db;
    public db;

    constructor(dbName: string) {
        db.Instance = this;
        this.db = new locallydb('./sensor_data');
    }

    public getCollection(name: string) {
        return this.db.collection(name);
    }

    public saveSensorData(data: ISensorData): ISensorData {
        let collection = this.getCollection(data.name);
        let lastData = this.getLastSensorData(data.name);

        if(lastData != null && lastData.temperature == data.temperature) {
            lastData.updated = data.created;
            collection.update(lastData.cid, lastData);
        } else {
            collection.insert(data);
        }

        collection.items.forEach(i => {
            if(moment.unix(i.created).isBefore(moment().subtract(1, 'days'))) {
                collection.remove(i.cid);
            }
    });
        collection.save();
        return data;
    }

    public getLastSensorData(sensorName: string): ISensorData {
        return _.last(this.getCollection(sensorName).items);
    }

    public getHistory(sensorName: string, time: number = 30): ISensorData[] {
        let minutesAgo = moment().subtract(time, 'minutes').unix();
        return this.getCollection(sensorName)
            .where("(@created > " + minutesAgo + " || @updated > " + minutesAgo + ")")
            .items;
    }
}
