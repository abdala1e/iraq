import { serve } from "https://deno.land/std@0.140.0/http/server.ts";

// --- الثوابت والمتغيرات تبقى كما هي ---
let lastDeliveredSegmentUrl: string | null = null;
let lastPlaylistUrl: string | null = null;
const USER_AGENTS = ["Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36", "VLC/3.0.20 LibVLC/3.0.20", "okhttp/4.9.3", "com.google.android.exoplayer2/2.18.1"];
const CORS_HEADERS = {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS', 'Access-Control-Expose-Headers': 'Content-Length, Content-Range', 'Access-Control-Allow-Credentials': 'true'};
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const STREAM_URL = 'http://splus.smartres.net/live/65787/54353/138896.m3u8';

async function handler(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const origin = url.origin;

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (url.pathname === '/abdullah.m3u8') {
        lastDeliveredSegmentUrl = null;
        lastPlaylistUrl = null;
        const simplePlaylistUrl = `${origin}/playlist.m3u8`;
        const masterPlaylist = `#EXTM3U\n#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=5000000,RESOLUTION=1920x1080,NAME="FHD"\n${simplePlaylistUrl}`;
        
        const headers = new Headers(CORS_HEADERS);
        headers.set('Content-Type', 'application/x-mpegURL');
        return new Response(masterPlaylist, { headers });
    }

    if (url.pathname === '/playlist.m3u8') {
        return proxyRequest(STREAM_URL, origin, STREAM_URL);
    }

    if (url.pathname.startsWith('/segment/')) {
        const encodedUrl = url.pathname.replace('/segment/', '');
        try {
            const targetUrlString = atob(encodedUrl);
            const playlistUrlFromQuery = url.searchParams.get('playlist');
            return proxyRequest(targetUrlString, origin, playlistUrlFromQuery);
        } catch (e) {
            return new Response("Invalid segment URL.", { status: 400, headers: CORS_HEADERS });
        }
    }

    return new Response('Not Found', { status: 404, headers: CORS_HEADERS });
}

async function proxyRequest(targetUrl: string, origin: string, playlistUrlFromQuery: string | null): Promise<Response> {
    try {
        let currentUrl = targetUrl;
        const isTsSegment = currentUrl.endsWith('.ts');

        if (isTsSegment && currentUrl === lastDeliveredSegmentUrl && playlistUrlFromQuery) {
            // ... (منطق المقاطع المكررة يبقى كما هو)
            let newSegmentFound = false;
            for (let attempt = 0; attempt < 10; attempt++) {
                await delay(250);
                try {
                    const playlistRes = await fetch(playlistUrlFromQuery, { signal: AbortSignal.timeout(2000) });
                    if (playlistRes.ok) {
                        const playlistBody = await playlistRes.text();
                        const segments = playlistBody.match(/^[^#\n].*?\.ts/gm);
                        if (segments && segments.length > 0) {
                            const latestSegment = new URL(segments[segments.length - 1], playlistUrlFromQuery).toString();
                            if (latestSegment !== currentUrl) {
                                currentUrl = latestSegment;
                                newSegmentFound = true;
                                break;
                            }
                        }
                    }
                } catch (e) { console.error(`[Smart Proxy] Error fetching playlist: ${e.message}`); }
            }
            if (!newSegmentFound) {
                return new Response('Gateway Timeout: Could not find a new segment.', { status: 504, headers: CORS_HEADERS });
            }
        }

        const response = await fetch(currentUrl, {
            headers: { 'User-Agent': USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)] }
        });

        if (!response.ok) {
            return new Response('Failed to fetch from origin.', { status: 502, headers: CORS_HEADERS });
        }

        if (isTsSegment) { lastDeliveredSegmentUrl = currentUrl; }

        // *** بداية الحل الصحيح ***
        // نأخذ كل الترويسات الأصلية من المصدر
        const newHeaders = new Headers(response.headers);
        
        // نضيف عليها ترويسات CORS للسماح للمتصفح بعرضها
        Object.entries(CORS_HEADERS).forEach(([key, value]) => newHeaders.set(key, value));
        
        // نضبط ترويسة التخزين المؤقت
        newHeaders.set('Cache-Control', 'no-cache');
        // *** نهاية الحل الصحيح ***

        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('mpegurl')) {
            lastPlaylistUrl = currentUrl;
            newHeaders.set('Content-Type', 'application/x-mpegURL');
            let body = await response.text();
            const baseUrl = new URL(currentUrl);
            
            body = body.replace(/^([^\s#].*)$/gm, line => {
                const segmentUrl = new URL(line, baseUrl).toString();
                const encodedSegmentUrl = btoa(segmentUrl);
                return `${origin}/segment/${encodedSegmentUrl}?playlist=${encodeURIComponent(currentUrl)}`;
            });
            
            return new Response(body, { status: response.status, headers: newHeaders });
        }

        // بالنسبة لمقاطع .ts، نرسل الاستجابة مع الترويسات المدمجة (الأصلية + CORS)
        return new Response(response.body, { status: response.status, headers: newHeaders });

    } catch (error) {
        console.error(`[FATAL] Proxy error: ${error.message}`);
        return new Response(`Proxy error: ${error.message}`, { status: 500, headers: CORS_HEADERS });
    }
}

serve(handler);
