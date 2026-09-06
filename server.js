/**
 * ==============================================================================
 * [LEGACY PROTOTYPE] server.js
 * ==============================================================================
 * Notice: This Node.js HTTP server was the initial prototype backend.
 * The production PreCare backend has been migrated to FastAPI (see backend/main.py).
 * This file is preserved for historical prototype reference and local Node fallback.
 * Production deployments should execute: uvicorn backend.main:app
 * ==============================================================================
 */

import http from 'http';
import {
  checkOllamaStatus,
  analyzeComplaintWithOllama,
  extractAnswerWithOllama,
} from './server/ollamaHandler.js';
import { handleClinicRoutes } from './server/clinicHandler.js';

const PORT = process.env.PORT || 3001;

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(data));
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  // Route 1: Status check
  if (req.method === 'GET' && url.pathname === '/api/ollama/status') {
    const status = await checkOllamaStatus();
    sendJson(res, status.ok ? 200 : 503, status);
    return;
  }

  // Route 2: Analyze complaint
  if (req.method === 'POST' && url.pathname === '/api/ollama/analyze') {
    try {
      const body = await parseJsonBody(req);
      const result = await analyzeComplaintWithOllama(body.complaint);
      sendJson(res, 200, { ok: true, data: result });
    } catch (err) {
      sendJson(res, 503, { ok: false, error: err.message });
    }
    return;
  }

  // Route 3: Extract answer
  if (req.method === 'POST' && url.pathname === '/api/ollama/extract') {
    try {
      const body = await parseJsonBody(req);
      const result = await extractAnswerWithOllama(body);
      sendJson(res, 200, { ok: true, data: result });
    } catch (err) {
      sendJson(res, 503, { ok: false, error: err.message });
    }
    return;
  }

  // Handle clinic auth and case routes
  if (
    url.pathname.startsWith('/api/auth/') ||
    url.pathname.startsWith('/api/clinics') ||
    url.pathname.startsWith('/api/cases')
  ) {
    const handled = await handleClinicRoutes(req, res, url, () => parseJsonBody(req), sendJson);
    if (handled !== false) return;
  }

  // Default 404
  sendJson(res, 404, { error: 'Not Found' });
});

server.listen(PORT, () => {
  console.log(`PreCare Backend Server running on http://localhost:${PORT}`);
  console.log(`Proxying AI queries to Ollama (qwen3:8b) at http://localhost:11434`);
});

export default server;
