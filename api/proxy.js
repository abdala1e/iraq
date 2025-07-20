export default async function handler(req, res) {
  const { url, headers } = req;
  let path = url.replace("/", "");

  if (!path || path === "iraq.m3u8") {
    path = "index.m3u8";
  }

  const base = "http://195.154.168.111:88/bein1/";
  const token = "?token=U288Sxdn1ol-W0";
  const targetUrl = base + path + (path.includes("?") ? "" : token);

  try {
    const upstreamRes = await fetch(targetUrl, {
      method: "GET",
      headers: {
        "User-Agent": headers["user-agent"] || "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Referer": "http://195.154.168.111:88/",
        "Origin": "http://195.154.168.111:88",
        "Accept": "*/*",
        "Connection": "keep-alive",
        "Accept-Encoding": "gzip, deflate",
        "Accept-Language": headers["accept-language"] || "en-US,en;q=0.9",
        "Host": "195.154.168.111:88",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
      }
    });

    const contentType = upstreamRes.headers.get("content-type") || "";

    // إذا الملف m3u8 نعيد كتابة الروابط الداخلية
    if (contentType.includes("application/vnd.apple.mpegurl") || path.endsWith(".m3u8")) {
      const originalText = await upstreamRes.text();
      const origin = `${headers["x-forwarded-proto"] || "https"}://${headers.host}`;

      const rewritten = originalText.replace(
        /^(?!#)(.*\.(ts|m3u8|key))(\?.*)?$/gm,
        (line) => `${origin}/${line.split("?")[0]}`
      );

      res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.status(200).send(rewritten);
      return;
    }

    // لباقي الملفات (ts أو key)
    res.setHeader("Content-Type", contentType || "application/octet-stream");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");

    upstreamRes.body.pipe(res);
  } catch (err) {
    console.error("Proxy Error:", err.message);
    res.status(502).send("فشل الاتصال بالسيرفر الأصلي.");
  }
}
