export default async function handler(req, res) {
  const { url } = req;
  let path = url.replace("/", "");

  // الملف الأساسي
  if (!path || path === "iraq.m3u8") {
    path = "index.m3u8";
  }

  // رابط السيرفر الأساسي والتوكن
  const base = "http://195.154.168.111:88/bein1/";
  const token = "?token=U288Sxdn1ol-W0";
  const targetUrl = base + path + (path.includes("?") ? "" : token);

  try {
    const upstreamRes = await fetch(targetUrl, {
      method: "GET",
      headers: {
        "Host": "195.154.168.111:88",
        "User-Agent": req.headers["user-agent"] || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36",
        "Accept": "*/*",
        "Referer": "http://195.154.168.111:88/",
        "Origin": "http://195.154.168.111:88",
        "Connection": "keep-alive",
        "Accept-Encoding": "gzip, deflate, br",
        "Accept-Language": "en-US,en;q=0.9,ar;q=0.8",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "same-origin",
      }
    });

    const contentType = upstreamRes.headers.get("content-type") || "";

    // إذا الملف M3U8
    if (
      contentType.includes("application/vnd.apple.mpegurl") ||
      path.endsWith(".m3u8")
    ) {
      const originalText = await upstreamRes.text();
      const origin = `${req.headers["x-forwarded-proto"] || "https"}://${req.headers.host}`;

      const rewritten = originalText.replace(
        /^(?!#)(.*\.(m3u8|ts|key))(\?.*)?$/gm,
        (line) => {
          const cleanLine = line.split("?")[0];
          return `${origin}/${cleanLine}`;
        }
      );

      res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.status(200).send(rewritten);
    } else {
      // ملفات TS أو .key
      res.setHeader("Content-Type", contentType || "application/octet-stream");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Headers", "*");

      upstreamRes.body.pipe(res);
    }
  } catch (err) {
    console.error("خطأ في الاتصال بالسيرفر:", err.message);
    res.status(502).send("Proxy Fetch Failed - السيرفر رفض الاتصال");
  }
}
