import * as express from 'express';
import * as cors from 'cors';
import * as _ from 'lodash';
import * as socketio from 'socket.io';
import { Sensor } from './sensor';
import {db} from "./db";
import {EventEmitter} from "events";

let amqp = require('amqp');
let events = new EventEmitter();


let startExpress = () => {
    let app = express();
    let server = require('http').Server(app);
    let io = socketio(server);

    io.on('connection', (socket) => {
        console.log('Client connected');

        function listener(temperature) {
            socket.emit('Temperature', temperature);
        }
        events.on('Temperature', listener);

        socket.on('disconnected', () => events.removeListener('Temperature', listener));
    });

    app.use(cors());
    app.options('*', cors());

    let api = express.Router();

    api.get('/temperatures/:name/:minutesAgo', (req: express.Request, res: express.Response) => {
        let name = req.params.name;
        let minutesAgo = req.params.minutesAgo;

        let sensor = new Sensor(name);
        let minutesHistory = minutesAgo == 'last' ? 60 * 8 : parseInt(minutesAgo);
        let history = sensor.getHistory(minutesHistory);

        if(history.length == 0) {
            return res.status(404).json({ message: "No history found for " + name + " in the last " + minutesHistory + " minutes" });
        }

        return res.json(minutesAgo == 'last' ? _.last(history) : history);
    });

    app.use('/api', api);

    server.listen(4000, () => {
        console.log('****/Note: This code is for viewing purposes only \n it will run however, this code is legacy and will no longer work/***');
        console.log('Listening on localhost port 4000');
    })
};

let listenToSensorQueue = () => {
    let connection = amqp.createConnection({ host: 'AMQP_HOST', port: 5672, login: 'AMQP_LOGIN', password: 'AMQP_PASSWORD', vhost: 'AMQP_VHOST', noDelay: true });
    connection.on('ready', () => {
        connection.queue("drier_temperature_sensors", { autoDelete: false, durable: true }, (queue) => {
            queue.bind('sensors', '#');
            queue.subscribe({ ack: true, prefetchCount: 0 }, (message, headers, deliveryInfo, ack) => {
                try {
                    let payload = JSON.parse(message.data);
                    let sensor = new Sensor(payload.name.toString());
                    let history = sensor.saveTemperature(payload.temperature, payload.timestamp, payload.type || 'ESB');
                    events.emit('Temperature', history);
                    ack.acknowledge();
                } catch(ex) {
                    console.log(ex);
                    ack.reject(true);
                }
            });
            console.log('Connected to sensor queue')
        });
    });
    connection.on('error', (e) => {
        console.log("Error from amqp: ", e);
    });
};

new db('db.json');
startExpress();
// listenToSensorQueue();