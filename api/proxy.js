addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

const BASE_URL = 'http://195.154.168.111:88/bein1/';
const TOKEN = '?token=U288Sxdn1ol-W0';

async function handleRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname.slice(1); // remove leading "/"

  const filename = !path || path === 'iraq.m3u8' ? 'index.m3u8' : path;
  const targetURL = BASE_URL + filename + (filename.includes('?') ? '' : TOKEN);

  try {
    const originResponse = await fetch(targetURL, {
      method: "GET",
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36',
        'Referer': 'http://195.154.168.111:88/',
        'Origin': 'http://195.154.168.111:88',
        'Accept': '*/*',
        'Connection': 'keep-alive',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
        'Host': '195.154.168.111:88',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      }
    });

    const contentType = originResponse.headers.get("content-type") || "";

    // إذا الملف m3u8، نعيد كتابة روابط ts بداخله
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

    // إذا ملف ts أو غيره، أرجعه مباشرة
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
    return new Response(`فشل جلب الملف من المصدر: ${err.message}`, { status: 502 });
  }
}
