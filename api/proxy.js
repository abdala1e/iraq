export default {
  async fetch(request) {
    const url = new URL(request.url);
    let path = url.pathname.slice(1);

    // إذا ما حددنا ملف، نرجع playlist الأصلي
    if (!path || path === "iraq.m3u8") {
      path = "playlist.m3u8";
    }

    const base = "https://svs.itworkscdn.net/smc4sportslive/smc4tv.smil/";

    const targetUrl = base + path;

    const modifiedRequest = new Request(targetUrl, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Referer": "https://www.smc4.tv/",  // سيرفر itworks يتحقق من الريفير
        "Origin": "https://www.smc4.tv",
      },
    });

    const upstreamResponse = await fetch(modifiedRequest);
    const contentType = upstreamResponse.headers.get("Content-Type") || "";

    if (contentType.includes("application/vnd.apple.mpegurl") || path.endsWith(".m3u8")) {
      const originalText = await upstreamResponse.text();

      // إعادة كتابة روابط ts لتشير لنفس البروكسي
      const rewritten = originalText.replace(
        /^(?!#)(.*\.ts)(\?.*)?$/gm,
        (line) => {
          const cleanLine = line.split("?")[0];
          return `${url.origin}/${cleanLine}`;
        }
      );

      return new Response(rewritten, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.apple.mpegurl",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "*",
        },
      });
    }

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      headers: {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
      },
    });
  }
}
