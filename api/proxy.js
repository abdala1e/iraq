export default async function handler(req, res) {
  const { url } = req;
  let path = url.replace("/", "");

  // إذا لم يتم تحديد ملف، استخدم index.m3u8
  if (!path || path === "iraq.m3u8") {
    path = "index.m3u8";
  }

  // رابط البث الأساسي بدون الملف
  const base = "http://195.154.168.111:88/bein1/";
  const token = "?token=U288Sxdn1ol-W0";
  const targetUrl = base + path + (path.includes("?") ? "" : token);

  try {
    const upstreamRes = await fetch(targetUrl, {
      headers: {
        "User-Agent": req.headers["user-agent"] || "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Referer": "http://195.154.168.111/",
        "Origin": "http://195.154.168.111",
        "Accept": "*/*",
        "Connection": "keep-alive",
        "Accept-Encoding": "gzip, deflate",
        "Accept-Language": req.headers["accept-language"] || "en-US,en;q=0.9,ar;q=0.8",
        "Host": "195.154.168.111:88",
      },
    });

    const contentType = upstreamRes.headers.get("content-type") || "";

    if (
      contentType.includes("application/vnd.apple.mpegurl") ||
      path.endsWith(".m3u8")
    ) {
      const originalText = await upstreamRes.text();
      const origin = `${req.headers["x-forwarded-proto"] || "https"}://${req.headers.host}`;

      // تعديل الروابط الداخلية في ملف m3u8 ليتم تمريرها عبر البروكسي
      const rewritten = originalText.replace(
        /^(?!#)(.*\.(m3u8|ts|key))(\?.*)?$/gm,
        (line) => {
          const cleanLine = line.split("?")[0];
          return `${origin}/${cleanLine}`;
        }
      );

      res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
      res.setHeader("Access-Control-Allow-Origin", "*");
      return res.status(200).send(rewritten);
    }

    // ملفات .ts أو .key أو أي ملفات ثانوية
    res.setHeader("Content-Type", contentType || "application/octet-stream");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");

    upstreamRes.body.pipe(res);
  } catch (err) {
    console.error("Fetch failed:", err);
    return res.status(502).send("Proxy Error");
  }
}
