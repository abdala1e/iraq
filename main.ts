import { serve } from "https://deno.land/std@0.140.0/http/server.ts";

// ... (كل الثوابت والمتغيرات تبقى كما هي)
let lastDeliveredSegmentUrl: string | null = null;
// ...

async function handler(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const origin = url.origin;
    const params = url.searchParams;

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (url.pathname === '/abdullah.m3u8') {
        lastDeliveredSegmentUrl = null;
        lastPlaylistUrl = null;
        const streamUrl = 'http://splus.smartres.net/live/65787/54353/138896.m3u8';
        const streamURLviaProxy = `${origin}/proxy/${encodeURIComponent(streamUrl)}?playlist=${encodeURIComponent(streamUrl)}`;
        const masterPlaylist = `#EXTM3U\n#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=5000000,RESOLUTION=1920x1080,NAME="FHD"\n${streamURLviaProxy}`;
        
        const headers = new Headers(CORS_HEADERS);
        // *** بداية التعديل الحاسم ***
        headers.set('Content-Type', 'application/x-mpegURL'); // <-- النوع الأكثر توافقية
        // *** نهاية التعديل الحاسم ***
        return new Response(masterPlaylist, { headers });
    }

    // --- التعامل مع روابط البروكسي /proxy/... ---
    if (url.pathname.startsWith('/proxy/')) {
        const targetUrlString = decodeURIComponent(url.pathname.replace('/proxy/', ''));
        const playlistUrlFromQuery = params.get('playlist');

        if (targetUrlString) {
            try {
                // ... (باقي الكود يبقى كما هو بالضبط)
                // ...
                const contentType = response.headers.get('content-type') || '';
                if (contentType.includes('mpegurl')) {
                    lastPlaylistUrl = currentUrl;
                    // *** تعديل إضافي هنا أيضًا لضمان التوافق الكامل ***
                    newHeaders.set('Content-Type', 'application/x-mpegURL');
                    let body = await response.text();
                    // ... (باقي الكود يبقى كما هو)
                    return new Response(body, { status: response.status, headers: newHeaders });
                }
                // ...
            } catch (error) {
                // ...
            }
        }
    }

    return new Response('Not Found', { status: 404, headers: CORS_HEADERS });
}

serve(handler);
