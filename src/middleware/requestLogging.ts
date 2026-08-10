import { Context, Next } from "hono";

/**
 * Log the information about the HTTP requests sent to the API
 * @param c 
 * @param next 
 */
async function logRequests(c: Context, next: Next) {
   const start = Date.now();

   await next();

   const duration = Date.now() - start;
   const user = c.get('user') || { username: 'Guest' };

   const time = new Date().toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
   });

   console.log(
      `${time} - ${user.username}: ${c.req.method} ${c.req.path} ${c.res.status} - ${duration}ms`
   );
}

export { logRequests }