"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServersController = void 0;
const Server_1 = require("../models/Server");
const Environment_1 = require("../models/Environment");
const net_1 = __importDefault(require("net"));
class ServersController {
    static async list(_req, res, next) {
        try {
            const servers = await Server_1.Server.findAll({
                include: [{ model: Environment_1.Environment, as: 'environment', attributes: ['id', 'name', 'slug', 'color'] }],
                order: [['name', 'ASC']],
            });
            res.json(servers);
        }
        catch (err) {
            next(err);
        }
    }
    static async create(req, res, next) {
        try {
            const { name, host, port, username, environment_id } = req.body;
            if (!name || !host) {
                res.status(400).json({ error: 'name and host are required' });
                return;
            }
            const server = await Server_1.Server.create({ name, host, port: port ?? 22, username, environment_id });
            const result = await Server_1.Server.findByPk(server.id, {
                include: [{ model: Environment_1.Environment, as: 'environment' }],
            });
            res.status(201).json(result);
        }
        catch (err) {
            next(err);
        }
    }
    static async update(req, res, next) {
        try {
            const server = await Server_1.Server.findByPk(req.params.id);
            if (!server) {
                res.status(404).json({ error: 'Not found' });
                return;
            }
            const { name, host, port, username, environment_id, status } = req.body;
            await server.update({ name, host, port, username, environment_id, status });
            res.json(server);
        }
        catch (err) {
            next(err);
        }
    }
    static async delete(req, res, next) {
        try {
            const server = await Server_1.Server.findByPk(req.params.id);
            if (!server) {
                res.status(404).json({ error: 'Not found' });
                return;
            }
            await server.destroy();
            res.json({ message: 'Deleted' });
        }
        catch (err) {
            next(err);
        }
    }
    static async ping(req, res, next) {
        try {
            const server = await Server_1.Server.findByPk(req.params.id);
            if (!server) {
                res.status(404).json({ error: 'Server not found' });
                return;
            }
            const isReachable = await new Promise((resolve) => {
                const socket = new net_1.default.Socket();
                let finished = false;
                socket.setTimeout(3000);
                socket.on('connect', () => {
                    finished = true;
                    socket.destroy();
                    resolve(true);
                });
                const handleFail = () => {
                    if (!finished) {
                        finished = true;
                        socket.destroy();
                        resolve(false);
                    }
                };
                socket.on('timeout', handleFail);
                socket.on('error', handleFail);
                socket.connect(server.port || 22, server.host);
            });
            const newStatus = isReachable ? 'active' : 'inactive';
            await server.update({ status: newStatus });
            res.json({
                message: `Connection ${isReachable ? 'succeeded' : 'failed'}`,
                status: newStatus,
                server,
            });
        }
        catch (err) {
            next(err);
        }
    }
}
exports.ServersController = ServersController;
