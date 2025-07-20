addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

const baseURL = 'http://cdnvine.com:8080/bn1hd/tracks-v1a1/';

async function handleRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname.replace('/', '');

  try {
    const filename = path === 'iraq.m3u8' ? 'mono.m3u8' : path;
    const targetURL = baseURL + filename;

    const originResponse = await fetch(targetURL, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'http://cdnvine.com/'
      }
    });

    const contentType = originResponse.headers.get('Content-Type') || 'application/vnd.apple.mpegurl';

    return new Response(originResponse.body, {
      status: originResponse.status,
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS'
      }
    });

  } catch (err) {
    return new Response('فشل في جلب البث من المصدر.', { status: 502 });
  }
}
