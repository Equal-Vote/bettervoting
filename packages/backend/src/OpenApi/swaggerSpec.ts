import swaggerJsdoc from 'swagger-jsdoc';

try{
  // intentionally require()'d (not the static `import` below) so a missing build
  // of the shared package throws here, where we can give a friendlier error message
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@equal-vote/star-vote-shared/schema.json')
}catch(_e){
  throw "Could not find shared module. Did you build it?\n Try: npm run build -w @equal-vote/star-vote-shared"
}

import schema from '@equal-vote/star-vote-shared/schema.json'; // Adjust the import path to your schema file
import ServiceLocator from '../ServiceLocator';

const mainUrl = ServiceLocator.globalData().mainUrl;
const isDev = mainUrl.includes('localhost');
const redirectUri = isDev ? 'http://localhost:3000' : 'https://bettervoting.com/API/Docs';
const loginUrl = `https://keycloak.prod.equal.vote/realms/Prod/protocol/openid-connect/auth?client_id=web&response_type=code&redirect_uri=${redirectUri}&scope=openid`
const devInstructions = `For API testing:<br>
                        1. [log in here](${loginUrl})<br>
                        2. Copy the token from the cookie named id_token by inspecting the page and going to the Application tab.<br>
                        3. Inspect this page and create an id_token cookie with the value you copied from the previous step.<br>
                        **Pasting it into the field below won't work since swagger doesn't allow setting cookies**`
const prodInstructions = `For API testing [log in here](${loginUrl})`;
const testingInstructions = isDev ? devInstructions : prodInstructions;
const options = {
  encoding: 'utf-8',
  failOnErrors: true,
  verbose: true,
  format: 'json',
  swaggerDefinition: {
    openapi: '3.0.0',
    info: {
      title: 'API Documentation',
      version: '1.0.0',
    },
    servers: [
      {
        url: '/API',
        description: 'Base URL for the API',
      },
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'id_token',
          description:  'This uses authenticaion token generated with a secret obtained from keycloak, the token can be ' +
                        'sent both as a cookie named id_token or in the auth_key property of the election object. [More information about ' +
                        'token generation can be found here](https://github.com/Equal-Vote/star-server/blob/6fdb2f653266' +
                        'b5f2710f0701509f54e1e558ecc1/docs/api.md)<br><br>' +
                        testingInstructions
        }
      },
      schemas: {
        ...schema.components.schemas,
      },
    },
  },

  apis: ['./src/Routes/*routes.ts'], // Adjust the path to your route files
};

const openapiSpecification = swaggerJsdoc(options);

export default openapiSpecification;