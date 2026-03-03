require('dotenv').config();
import express from 'express';
import {electionsRouter, ballotRouter, rollRouter} from './Routes';
 
// var debugRouter = require('./Routes/debug.routes')
import cors from 'cors';
import cookieParser from 'cookie-parser';
import Logger from './Services/Logging/Logger';
import {IRequest, iRequestMiddleware, reqIdSuffix} from './IRequest';
import { loggerMiddleware } from './Services/Logging/LoggerMiddleware';
import { errorCatch } from './errorCatchMiddleware'
import registerEvents from './Routes/registerEvents';
import { getMetaTags } from './Util';
import swaggerUi from 'swagger-ui-express';
import swagger from './OpenApi/swagger.json';

import { getUserToken, getUser } from './Controllers/User';
const asyncHandler = require('express-async-handler')
require('./socketHandler')

export default function makeApp() {
    const app = express();
    const appInitContext = Logger.createContext("appInit");

    // CORS (Cross-origin resource sharing), allows for the backend to receive calls from the front end, even though they have different urls/origins
    //      (at least that's my understanding)
    const prodEndpoints : any = process.env.ALLOWED_URLS?.split(',') || 'https://bettervoting.com/';
    app.use(cors({
        origin: prodEndpoints,
        credentials: true, // allow the backend to receive cookies from the frontend
    }))

    // Set to trust proxy so we can resolve client IP address
    app.enable('trust proxy')

    app.use(iRequestMiddleware);
    app.use(loggerMiddleware);

    app.use(cookieParser())

    const frontendPath = '../../../../packages/frontend/build/';
    
    const path = require('path');
    app.use(express.json());
    //Routes
    app.use('/API', getUser, electionsRouter)
    app.use('/API', getUser, ballotRouter)
    app.use('/API', getUser, rollRouter)
    // app.use('/debug',debugRouter)
    app.use('/API/Docs', swaggerUi.serve, swaggerUi.setup(swagger));
    app.post('/API/Token', asyncHandler(getUserToken));

    // NOTE: I've removed express.static because it doesn't allow me to inject meta tags
    // https://stackoverflow.com/questions/51120214/how-to-modify-static-file-content-with-express-static
    app.get('*', (req, res) => {
        const fs = require('fs');
        fs.readFile(path.join(__dirname, frontendPath, req.url.split('?')[0]), 'utf8', (err:any, htmlData:string) => {
            if(err){
                // if the request wants a webpage, then return index.html and inject meta tags

                // https://blog.logrocket.com/adding-dynamic-meta-tags-react-app-without-ssr/
                fs.readFile(path.join(__dirname, frontendPath, 'index.html'), 'utf8', async (err:any, htmlData:string) => {
                    if(err){
                        console.error('Error during file reading', err);
                        return res.status(404).end();
                    }

                    // inject tags
                    const tags = await getMetaTags(req);

                    Object.entries(tags).forEach(([key, value]) => {
                        htmlData = htmlData.replaceAll(key, value);
                    });

                    return res.send(htmlData)
                })
            }else{
                // if a specific asset is being requested (an image, complied javascript, etc), then return the raw file

                res.sendFile(path.join(__dirname, frontendPath, req.url))
            }
        })
    })

    app.use(errorCatch);

    registerEvents();

    Logger.debug(appInitContext, "app Init complete");

    return app;
}
