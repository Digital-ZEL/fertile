/**
 * API Key Authentication Middleware
 *
 * Validates X-API-Key header against configured API keys.
 * Keys are stored in FERTILE_API_KEYS env var (comma-separated).
 * If no keys are configured, all requests are allowed (dev mode).
 */

import { NextRequest, NextResponse } from 'next/server';

export interface AuthResult {
  authenticated: boolean;
  error?: NextResponse;
}

export function validateApiKey(request: NextRequest): AuthResult {
  const apiKeysEnv = process.env.FERTILE_API_KEYS;

  // Dev mode: no keys configured = allow all
  if (!apiKeysEnv) {
    return { authenticated: true };
  }

  const validKeys = apiKeysEnv.split(',').map((k) => k.trim()).filter(Boolean);
  if (validKeys.length === 0) {
    return { authenticated: true };
  }

  const providedKey = request.headers.get('x-api-key');

  if (!providedKey) {
    return {
      authenticated: false,
      error: NextResponse.json(
        { error: 'Missing X-API-Key header' },
        { status: 401, headers: corsHeaders() }
      ),
    };
  }

  if (!validKeys.includes(providedKey)) {
    return {
      authenticated: false,
      error: NextResponse.json(
        { error: 'Invalid API key' },
        { status: 403, headers: corsHeaders() }
      ),
    };
  }

  return { authenticated: true };
}

export function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
  };
}

export function handleCors(): NextResponse {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}
