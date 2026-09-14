import express from 'express';
import { Server, Socket } from 'socket.io';
import http from 'http';

import { innerGetGlobalElectionStats } from './Controllers/Election';


export let io: Server|null = null;

export const setupSockets = (app: express.Application) => {
    const server = http.createServer(app)


    io = new Server(server, {
        cors: {
            origin: process.env.ALLOWED_URLS?.split(',') || 'localhost'
        }
    })

    io.on('connection', (socket: Socket) => {
        socket.on('join_landing_page', async () => {
            socket.join('landing_page');
            socket.emit('updated_stats', await innerGetGlobalElectionStats(app.locals.req));
        })
    })

    return server;
}