import { Hono } from 'hono';

import getAllLogs from './controllers/getAllLogs';

export default new Hono().route('/', getAllLogs);
