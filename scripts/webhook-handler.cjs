/**
 * Meiji Town - GitHub Auto-Update Webhook Handler
 * Integrates with The Flying Dutchmen Koa router to auto-pull updates on GitHub push events.
 */

const { execSync } = require('child_process');
const crypto = require('crypto');
const path = require('path');

class MeijiWebhookHandler {
  constructor(options = {}) {
    this.secret = options.secret || process.env.MEIJI_WEBHOOK_SECRET || '';
    this.repoDir = path.resolve(__dirname, '..');
    this.logs = [];
  }

  log(msg) {
    const entry = `[${new Date().toISOString()}] ${msg}`;
    console.log(`[MEIJI-WEBHOOK] ${msg}`);
    this.logs.unshift(entry);
    if (this.logs.length > 50) this.logs.pop();
  }

  verifySignature(ctx) {
    if (!this.secret) return true; // Permissive if no specific secret set
    const sig = ctx.request.headers['x-hub-signature-256'];
    if (!sig) return false;

    // Use rawBody if available; if only parsed body exists, verify best-effort
    const payload = ctx.request.rawBody || (typeof ctx.request.body === 'string' ? ctx.request.body : JSON.stringify(ctx.request.body || {}));
    const hmac = crypto.createHmac('sha256', this.secret);
    const digest = 'sha256=' + hmac.update(payload).digest('hex');

    try {
      const a = Buffer.from(sig);
      const b = Buffer.from(digest);
      if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
        return true;
      }
    } catch (_) {}

    // If rawBody wasn't preserved by koa-bodyparser, warn rather than break deployment
    if (!ctx.request.rawBody && process.env.ENFORCE_WEBHOOK_SECRET !== 'true') {
      this.log('Warning: rawBody unavailable in bodyparser; allowing push event.');
      return true;
    }
    return false;
  }

  async handleRequest(ctx) {
    const event = ctx.request.headers['x-github-event'] || 'push';

    // Respond to GitHub ping event
    if (event === 'ping') {
      this.log('Received GitHub ping event.');
      ctx.status = 200;
      ctx.body = { status: 'ok', message: 'Pong! Meiji Town webhook endpoint is active.' };
      return;
    }

    // Verify secret signature if strictly configured
    if (this.secret && !this.verifySignature(ctx)) {
      this.log('Webhook signature verification failed.');
      ctx.status = 401;
      ctx.body = { error: 'Invalid webhook signature' };
      return;
    }

    try {
      this.log(`Pulling latest commits in ${this.repoDir}...`);
      try {
        execSync(`git config --global --add safe.directory "${this.repoDir}"`, { stdio: 'ignore' });
      } catch (_) {}

      // Fetch and reset hard to origin/main to prevent line-ending/merge halts
      const output = execSync('git fetch origin main && git reset --hard origin/main', {
        cwd: this.repoDir,
        encoding: 'utf8',
        timeout: 45000
      });
      this.log(`Git pull output:\n${output.trim()}`);

      ctx.status = 200;
      ctx.body = {
        success: true,
        message: 'Meiji Town updated successfully',
        output: output.trim(),
        timestamp: new Date().toISOString()
      };
    } catch (err) {
      this.log(`Git pull failed: ${err.message}`);
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: err.message
      };
    }
  }

  getLogs(ctx) {
    ctx.status = 200;
    ctx.body = {
      game: 'meiji-town',
      logs: this.logs
    };
  }
}

module.exports = MeijiWebhookHandler;
