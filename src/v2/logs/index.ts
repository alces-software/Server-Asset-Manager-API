import { Hono } from 'hono';

import getAllLogs from './controllers/getAllLogs';
import stats from './controllers/stats';

export default new Hono().route('/stats', stats).route('/', getAllLogs);
