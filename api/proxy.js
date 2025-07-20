addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

const baseURL = 'http://cdnvine.com:8080/bn1hd/tracks-v1a1/';
const defaultFile = 'mono.m3u8';

async function handleRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname.slice(1); // remove the leading "/"
  const filename = !path || path === 'iraq.m3u8' ? defaultFile : path;
  const targetURL = baseURL + filename;

  try {
    const originResponse = await fetch(targetURL, {
      method: "GET",
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36',
        'Referer': 'http://cdnvine.com/',
        'Origin': 'http://cdnvine.com',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Host': 'cdnvine.com:8080',
      }
    });

    const contentType = originResponse.headers.get("content-type") || "";

    // إذا الملف .m3u8، أعد كتابة الروابط داخله
    if (filename.endsWith('.m3u8') || contentType.includes('application/vnd.apple.mpegurl')) {
      const text = await originResponse.text();
      const origin = url.origin;

      const rewritten = text.replace(
        /^(?!#)(.*\.(ts|m3u8|key))(\?.*)?$/gm,
        line => `${origin}/${line.split('?')[0]}`
      );

      return new Response(rewritten, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': '*',
          'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS'
        }
      });
    }

    // إذا كانت ملفات ts أو key
    return new Response(originResponse.body, {
      status: originResponse.status,
      headers: {
        'Content-Type': contentType || 'application/octet-stream',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS'
      }
    });

  } catch (err) {
    return new Response(`فشل في جلب الملف: ${err.message}`, { status: 502 });
  }
}
