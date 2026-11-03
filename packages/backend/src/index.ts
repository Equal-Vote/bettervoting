import 'dotenv/config';

import makeApp from './app';
import { setupSockets } from './socketHandler';
import Logger from './Services/Logging/Logger';

// A promise that rejects with nobody awaiting it (e.g. a controller that forgets an
// `await`) would otherwise terminate the whole process. Log it and keep serving.
process.on('unhandledRejection', (reason) => {
    Logger.error(Logger.createContext('unhandledRejection'), 'Unhandled promise rejection', reason);
});

const app = makeApp()
const server = setupSockets(app);

//Start server
const PORT = process.env.BACKEND_PORT || 5000;
server.listen(PORT, () => console.info(`Server started on port ${PORT}`));
