import http from 'node:http';
import https from 'node:https';
import { safeErrorMessage } from './redact.js';

const DEFAULT_TIMEOUT_MS = 15000;
const CONNECT_FAMILY = 4;

export class HttpError extends Error {
  constructor(message, { status = 0, code = 'HTTP_ERROR', retryable = false } = {}) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.retryable = retryable;
  }
}

const isRetryableStatus = (status) => status === 429 || status >= 500;

export const requestJson = ({
  url,
  method = 'GET',
  headers = {},
  body,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  signal,
} = {}) =>
  new Promise((resolve, reject) => {
    let parsed;
    try {
      parsed = new URL(url);
    } catch (error) {
      reject(new HttpError('Invalid request URL', { code: 'EINVAL' }));
      return;
    }

    const transport = parsed.protocol === 'http:' ? http : https;
    const payload = body == null ? null : Buffer.from(typeof body === 'string' ? body : JSON.stringify(body));
    const reqHeaders = {
      Accept: 'application/json',
      ...headers,
    };
    if (payload) {
      reqHeaders['Content-Type'] = reqHeaders['Content-Type'] || 'application/json';
      reqHeaders['Content-Length'] = String(payload.length);
    }

    const req = transport.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === 'http:' ? 80 : 443),
        path: `${parsed.pathname}${parsed.search}`,
        method,
        family: CONNECT_FAMILY,
        headers: reqHeaders,
      },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8');
          let json = null;
          if (raw) {
            try {
              json = JSON.parse(raw);
            } catch {
              json = null;
            }
          }

          const status = res.statusCode || 0;
          if (status < 200 || status >= 300) {
            const apiMsg = json?.error?.message || json?.message;
            const fullMsg = apiMsg ? `Request failed with status ${status}: ${apiMsg}` : `Request failed with status ${status}`;
            reject(
              new HttpError(fullMsg, {
                status,
                code: status === 429 ? 'RATE_LIMIT' : 'HTTP_ERROR',
                retryable: isRetryableStatus(status),
              })
            );
            return;
          }

          resolve({
            status,
            headers: res.headers,
            json,
            raw,
          });
        });
      }
    );

    req.on('error', (error) => {
      reject(
        new HttpError(safeErrorMessage(error), {
          code: error.code || 'NETWORK_ERROR',
          retryable: true,
        })
      );
    });

    req.setTimeout(timeoutMs, () => {
      req.destroy(
        Object.assign(new Error(`Connect or request timed out after ${timeoutMs}ms`), {
          code: 'ETIMEDOUT',
        })
      );
    });

    if (signal) {
      if (signal.aborted) {
        req.destroy(Object.assign(new Error('The operation was aborted'), { name: 'AbortError', code: 'ABORT_ERR' }));
        return;
      }
      signal.addEventListener(
        'abort',
        () => {
          req.destroy(Object.assign(new Error('The operation was aborted'), { name: 'AbortError', code: 'ABORT_ERR' }));
        },
        { once: true }
      );
    }

    if (payload) req.write(payload);
    req.end();
  });
