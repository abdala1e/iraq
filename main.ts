import { serve } from "https://deno.land/std@0.140.0/http/server.ts";

const USER_AGENTS = ["Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36", "VLC/3.0.20 LibVLC/3.0.20", "okhttp/4.9.3", "com.google.android.exoplayer2/2.18.1"];
const CORS_HEADERS = {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS', 'Access-Control-Expose-Headers': 'Content-Length, Content-Range', 'Access-Control-Allow-Credentials': 'true'};

async function handler(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const params = url.searchParams;
    const origin = url.origin;

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // --- الرابط النظيف /iraq.m3u8 ---
    if (url.pathname === '/iraq.m3u8') {
        const streamUrl = 'http://apk.dream4k.co/live/6gi2up0jbb/dxu4mhmspq/1269943.m3u8';
        // Deno Deploy ذكي، لا نحتاج لإعادة كتابة الروابط. نمرر الرابط مباشرة.
        const streamURLviaProxy = `${origin}/?target=${encodeURIComponent(streamUrl)}`;
        const masterPlaylist = `#EXTM3U\n#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=5000000,RESOLUTION=1920x1080,NAME="FHD"\n${streamURLviaProxy}`;
            
        const headers = new Headers(CORS_HEADERS);
        headers.set('Content-Type', 'application/vnd.apple.mpegurl');
        return new Response(masterPlaylist, { headers });
    }

    const targetUrlString = params.get('target');
    if (targetUrlString) {
        try {
            const response = await fetch(targetUrlString, {
                headers: { 'User-Agent': USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)] }
            });

            if (!response.ok) {
                return new Response('Failed to fetch from origin.', { status: 502, headers: CORS_HEADERS });
            }

            const contentType = response.headers.get('content-type') || '';
            const newHeaders = new Headers(CORS_HEADERS);
            response.headers.forEach((value, key) => newHeaders.set(key, value));

            if (contentType.includes('mpegurl')) {
                let body = await response.text();
                const baseUrl = new URL(targetUrlString);
                // إعادة كتابة الروابط لتمر عبر البروكسي
                body = body.replace(/^(https?:\/\/[^\s]+)$/gm, line => `${origin}/?target=${encodeURIComponent(line)}`);
                body = body.replace(/^([^\s#].*)$/gm, line => `${origin}/?target=${encodeURIComponent(new URL(line, baseUrl).toString())}`);
                return new Response(body, { status: response.status, headers: newHeaders });
            }

            return new Response(response.body, { status: response.status, headers: newHeaders });

        } catch (error) {
            return new Response(`Proxy error: ${error.message}`, { status: 500, headers: CORS_HEADERS });
        }
    }

    return new Response('Not Found', { status: 404, headers: CORS_HEADERS });
}

serve(handler);
