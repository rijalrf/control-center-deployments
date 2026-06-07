"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServersController = void 0;
const Server_1 = require("../models/Server");
const Environment_1 = require("../models/Environment");
class ServersController {
    static async list(req, res, next) {
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
                return res.status(400).json({ error: 'name and host are required' });
            }
            const server = await Server_1.Server.create({ name, host, port: port || 22, username, environment_id });
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
                return res.status(404).json({ error: 'Not found' });
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
                return res.status(404).json({ error: 'Not found' });
            }
            await server.destroy();
            res.json({ message: 'Deleted' });
        }
        catch (err) {
            next(err);
        }
    }
}
exports.ServersController = ServersController;
