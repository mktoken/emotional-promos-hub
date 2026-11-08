import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const allowedOrigin = 'https://articulospromocionales.vip';
const reservedMarkers = new Set(['198.51.100.83', '203.0.113.84']);

Deno.serve((req: Request) => {
  const origin = req.headers.get('origin');
  const cfIp = req.headers.get('cf-connecting-ip');
  const marker = req.headers.get('x-pe-ip-probe-marker');
  const responseHeaders = {
    ...corsHeaders,
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'CF-Connecting-IP, X-PE-IP-Probe-Marker',
    'Access-Control-Max-Age': '0',
    'Cache-Control': 'no-store, no-cache, max-age=0, must-revalidate',
    'CDN-Cache-Control': 'no-store',
    'Cloudflare-CDN-Cache-Control': 'no-store',
    'Pragma': 'no-cache',
    'Vary': 'Origin',
    'Content-Type': 'application/json',
  };
  const result = {
    cf_ip_matches_marker: marker !== null && reservedMarkers.has(marker) && cfIp === marker,
    cf_ip_present: cfIp !== null && cfIp.trim().length > 0,
    x_forwarded_for_present: req.headers.has('x-forwarded-for'),
    probe_version: 'pe-int-03-v1',
  };
  const status = origin !== null && origin !== allowedOrigin ? 403
    : req.method !== 'GET' && req.method !== 'OPTIONS' ? 405
    : marker !== null && !reservedMarkers.has(marker) ? 400 : 200;
  return new Response(JSON.stringify(result), { status, headers: responseHeaders });
});