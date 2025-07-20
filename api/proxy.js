import { Readable } from 'stream';

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
        "User-Agent": headers["user-agent"] || "Mozilla/5.0",
        "Referer": "http://195.154.168.111:88/",
        "Origin": "http://195.154.168.111:88",
        "Accept": "*/*",
        "Connection": "keep-alive",
        "Accept-Encoding": "identity", // مهمة جداً
        "Accept-Language": headers["accept-language"] || "en-US,en;q=0.9",
        "Host": "195.154.168.111:88",
        "Range": req.headers["range"] || "bytes=0-", // مهم لملفات .ts
      }
    });

    const contentType = upstreamRes.headers.get("content-type") || "";

    // إذا ملف .m3u8 نعدّل روابطه الداخلية
    if (contentType.includes("application/vnd.apple.mpegurl") || path.endsWith(".m3u8")) {
      const originalText = await upstreamRes.text();
      const origin = `${headers["x-forwarded-proto"] || "https"}://${headers.host}`;

      const rewritten = originalText.replace(
        /^(?!#)(.*\.(ts|m3u8|key))(\?.*)?$/gm,
        (line) => `${origin}/${line.split("?")[0]}`
      );

      res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
      res.setHeader("Access-Control-Allow-Origin", "*");
      return res.status(200).send(rewritten);
    }

    // ملفات .ts أو .key — نستخدم buffer بدلاً من pipe لحل مشاكل Vercel
    const buffer = await upstreamRes.arrayBuffer();
    const stream = Readable.from(Buffer.from(buffer));

    res.setHeader("Content-Type", contentType || "application/octet-stream");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Length", Buffer.byteLength(buffer));
    res.setHeader("Accept-Ranges", "bytes");
    res.status(upstreamRes.status);
    stream.pipe(res);
  } catch (err) {
    console.error("Proxy Error:", err.message);
    res.status(502).send("فشل في الاتصال بالمصدر.");
  }
}
