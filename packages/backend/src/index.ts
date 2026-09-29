import 'dotenv/config';

import makeApp from './app';
import { setupSockets } from './socketHandler';

const app = makeApp()
const server = setupSockets(app);

//Start server
const PORT = process.env.BACKEND_PORT || 5000;
server.listen(PORT, () => console.info(`Server started on port ${PORT}`));
