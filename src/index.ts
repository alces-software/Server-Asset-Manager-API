import 'dotenv/config';

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { compress } from 'hono/compress';
import { trimTrailingSlash } from 'hono/trailing-slash';

import { internalServerError } from './lib/errorMessages';
import { getUserFromJWT, validateJWT } from './middleware/jwtValidation';
import { logRequests } from './middleware/requestLogging';

import v1 from './v1';
import v2 from './v2';

const app = new Hono();

// Load all the middleware
app.use(
   '*',
   cors({
      allowMethods: ['POST', 'GET', 'DELETE', 'PATCH', 'PUT', 'OPTIONS']
   })
);
app.use('*', trimTrailingSlash());
app.use('*', compress());
app.use('/api/*', validateJWT);
app.use('/api/*', getUserFromJWT);
app.use('*', logRequests);

// Load endpoints
app.route('/api/v1', v1);
app.route('/api/v2', v2);

// Handle uncaught errors
app.onError((err, c) => internalServerError(c, err));

// 404 Error
app.notFound((c) =>
   c.json(
      {
         error: 'Not Found',
         message: `well well well, what have we here then`
      },
      404
   )
);

// Start listening to port
serve({
   fetch: app.fetch,
   port: Number(process.env.PORT) || 3000
});
