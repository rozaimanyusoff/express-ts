/**
 * Simple webhook helper
 * Uses global fetch (Node 18+) to POST JSON payload to a URL.
 * Options:
 *  - fireAndForget: if true, the function will start the request and not await it (errors are logged)
 */
import logger from './logger';

export interface SendWebhookOptions {
  fireAndForget?: boolean;
  headers?: Record<string, string>;
}

export async function sendWebhook(url: string, payload: any, opts: SendWebhookOptions = {}): Promise<void> {
  const headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});

  const doFetch = async () => {
    try {
      const res = await fetch(url, {
        body: JSON.stringify(payload),
        headers,
        method: 'POST',
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        logger.error(`Webhook POST to ${url} failed: ${res.status} ${res.statusText} ${text}`);
      }
    } catch (err) {
      logger.error(`Webhook POST to ${url} error: ${String(err)}`);
    }
  };

  if (opts.fireAndForget) {
    // start and do not await
    void doFetch();
    return;
  }

  await doFetch();
}

export default sendWebhook;
