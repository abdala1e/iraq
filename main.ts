import { serve } from "https://deno.land/std@0.140.0/http/server.ts";

// --- نفس المتغيرات والثوابت من الكود الأصلي ---
let lastDeliveredSegmentUrl: string | null = null;
let lastPlaylistUrl: string | null = null;

const USER_AGENTS = ["Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36", "VLC/3.0.20 LibVLC/3.0.20", "okhttp/4.9.3", "com.google.android.exoplayer2/2.18.1"];
const CORS_HEADERS = {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS', 'Access-Control-Expose-Headers': 'Content-Length, Content-Range', 'Access-Control-Allow-Credentials': 'true'};
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- بداية الترجمة الدقيقة للكود ---
async function handler(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const origin = url.origin;
    const params = url.searchParams;

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // --- التعامل مع الرابط الرئيسي /iraq.m3u8 ---
    if (url.pathname === '/iraq.m3u8') {
        lastDeliveredSegmentUrl = null;
        lastPlaylistUrl = null;
        const streamUrl = 'http://apk.dream4k.co/live/6gi2up0jbb/dxu4mhmspq/1269943.m3u8';
        const streamURLviaProxy = `${origin}/proxy/${encodeURIComponent(streamUrl)}?playlist=${encodeURIComponent(streamUrl)}`;
        const masterPlaylist = `#EXTM3U\n#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=5000000,RESOLUTION=1920x1080,NAME="FHD"\n${streamURLviaProxy}`;
        
        const headers = new Headers(CORS_HEADERS);
        headers.set('Content-Type', 'application/vnd.apple.mpegurl');
        return new Response(masterPlaylist, { headers });
    }

    // --- التعامل مع روابط البروكسي /proxy/... ---
    if (url.pathname.startsWith('/proxy/')) {
        const targetUrlString = decodeURIComponent(url.pathname.replace('/proxy/', ''));
        const playlistUrlFromQuery = params.get('playlist');

        if (targetUrlString) {
            try {
                let currentUrl = targetUrlString;
                const isTsSegment = currentUrl.endsWith('.ts');

                // --- نفس المنطق الذكي للتعامل مع المقاطع المكررة ---
                if (isTsSegment && currentUrl === lastDeliveredSegmentUrl && playlistUrlFromQuery) {
                    console.log(`[Smart Proxy] Duplicate segment request: ${currentUrl}. Waiting...`);
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

                // --- نفس منطق إعادة المحاولة ---
                let response: Response | null = null;
                const maxRetries = 5;
                for (let i = 0; i < maxRetries; i++) {
                    const fetchUrl = new URL(currentUrl);
                    const requestHeaders = { 'User-Agent': USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)], 'Origin': fetchUrl.origin, 'Referer': fetchUrl.origin + '/' };
                    try {
                        response = await fetch(currentUrl, { method: 'GET', headers: requestHeaders, redirect: 'manual' });
                        if (response.status >= 300 && response.status < 400) {
                            const location = response.headers.get('Location');
                            if (location) { currentUrl = new URL(location, currentUrl).toString(); if (i < maxRetries - 1) continue; }
                        }
                        if (response.ok) break;
                    } catch (error) { console.error(`Attempt ${i + 1} for ${currentUrl} failed: ${error.message}`); }
                    if (i < maxRetries - 1) await delay(500 * (i + 1));
                }

                if (!response || !response.ok) {
                    return new Response('Failed to fetch from origin after all retries.', { status: 502, headers: CORS_HEADERS });
                }

                if (isTsSegment) { lastDeliveredSegmentUrl = currentUrl; }

                const newHeaders = new Headers(CORS_HEADERS);
                response.headers.forEach((value, key) => {
                    if (!['content-encoding', 'transfer-encoding', 'connection'].includes(key.toLowerCase())) {
                        newHeaders.set(key, value);
                    }
                });
                newHeaders.set('Cache-Control', 'no-cache');

                const contentType = response.headers.get('content-type') || '';
                if (contentType.includes('mpegurl')) {
                    lastPlaylistUrl = currentUrl;
                    let body = await response.text();
                    const baseUrl = new URL(currentUrl);
                    const proxyPrefix = `${origin}/proxy/`;
                    body = body.replace(/^(https?:\/\/[^\s]+)$/gm, line => `${proxyPrefix}${encodeURIComponent(line)}?playlist=${encodeURIComponent(currentUrl)}`);
                    body = body.replace(/^([^\s#].*)$/gm, line => `${proxyPrefix}${encodeURIComponent(new URL(line, baseUrl).toString())}?playlist=${encodeURIComponent(currentUrl)}`);
                    return new Response(body, { status: response.status, headers: newHeaders });
                }

                // --- استخدام الإرسال المتدفق السريع لمقاطع .ts ---
                return new Response(response.body, { status: response.status, headers: newHeaders });

            } catch (error) {
                console.error(`[FATAL] Proxy error: ${error.message}`);
                return new Response(`Proxy error: ${error.message}`, { status: 500, headers: CORS_HEADERS });
            }
        }
    }

    return new Response('Not Found', { status: 404, headers: CORS_HEADERS });
}

serve(handler);
