/**
 * Standalone Local Backend Dev Server for Spark Plan
 * Runs all Cloud Function HTTP handlers locally on http://localhost:5001
 * without requiring Blaze plan deployment or Java 21 emulators.
 * Includes automated background scheduler polling for due scheduled posts.
 */
const http = require('http');
const { _handlers } = require('./index');
const { processDueScheduledItems } = require('./services/schedulerService');

const PORT = Number(process.env.FUNCTIONS_PORT || 5001);
const PROJECT_PREFIX = '/instaflow-a6c18/us-central1/';

function createExpressLikeResponse(nodeRes) {
  const wrapped = {
    statusCode: 200,
    setHeader(k, v) {
      nodeRes.setHeader(k, v);
      return wrapped;
    },
    getHeader(k) {
      return nodeRes.getHeader(k);
    },
    status(code) {
      wrapped.statusCode = code;
      nodeRes.statusCode = code;
      return wrapped;
    },
    json(payload) {
      if (!nodeRes.getHeader('Content-Type')) {
        nodeRes.setHeader('Content-Type', 'application/json');
      }
      nodeRes.end(JSON.stringify(payload));
      return wrapped;
    },
    send(payload) {
      nodeRes.end(typeof payload === 'string' ? payload : JSON.stringify(payload));
      return wrapped;
    },
    end(payload) {
      nodeRes.end(payload);
      return wrapped;
    },
  };
  return wrapped;
}

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
  const chunks = [];

  req.on('data', (chunk) => chunks.push(chunk));
  req.on('end', () => {
    const rawBody = Buffer.concat(chunks);
    req.rawBody = rawBody;
    req.query = Object.fromEntries(parsedUrl.searchParams.entries());

    if (rawBody.length > 0 && (req.headers['content-type'] || '').includes('application/json')) {
      try {
        req.body = JSON.parse(rawBody.toString('utf8'));
      } catch {
        req.body = {};
      }
    } else {
      req.body = {};
    }

    let routeName = parsedUrl.pathname.replace(/^\/+/, '');
    if (parsedUrl.pathname.startsWith(PROJECT_PREFIX)) {
      routeName = parsedUrl.pathname.slice(PROJECT_PREFIX.length);
    } else if (parsedUrl.pathname.startsWith('/api/')) {
      routeName = parsedUrl.pathname.slice('/api/'.length);
    }

    // Health route alias
    if (routeName === '' || routeName === 'health') {
      routeName = 'apiHealth';
    }

    const handler = _handlers[routeName];
    if (!handler) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          ok: false,
          error: `Unknown endpoint "${routeName}"`,
          availableEndpoints: Object.keys(_handlers),
        })
      );
      return;
    }

    try {
      handler(req, createExpressLikeResponse(res));
    } catch (handlerErr) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          ok: false,
          error: handlerErr.message || 'Internal handler error',
        })
      );
    }
  });
});

let schedulerInterval = null;

function startBackgroundScheduler(intervalMs = 30000) {
  if (schedulerInterval) return;
  console.log(`[InstaFlow Scheduler] Automated background scheduler started (tick: ${intervalMs / 1000}s)`);

  schedulerInterval = setInterval(async () => {
    try {
      const report = await processDueScheduledItems({ nowMs: Date.now() });
      if (report.dueCount > 0) {
        console.log(
          `[InstaFlow Scheduler] Processed ${report.dueCount} due post(s): ${report.successes} published, ${report.failures} failed.`
        );
      }
    } catch {
      // Quiet background log
    }
  }, intervalMs);
}

function stopBackgroundScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }
}

if (require.main === module) {
  server.listen(PORT, '127.0.0.1', () => {
    console.log(
      `[InstaFlow Local Backend] Listening on http://127.0.0.1:${PORT}${PROJECT_PREFIX}<endpoint>`
    );
    startBackgroundScheduler(30000);
  });
}

module.exports = {
  server,
  createExpressLikeResponse,
  startBackgroundScheduler,
  stopBackgroundScheduler,
};
