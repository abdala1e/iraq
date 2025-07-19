export default async function handler(req, res) {
  const { url } = req;
  let path = url.replace("/", "");

  // المسار الرئيسي إذا ماكو شيء
  if (!path || path === "iraq.m3u8") {
    path = ".m3u8";
  }

  const base = "http://176.119.29.35/01ed3a36-03b2-4f64-9dfa-dea3df61b611";
  const targetUrl = base + path;

  try {
    const upstreamRes = await fetch(targetUrl, {
      headers: {
        "User-Agent": req.headers["user-agent"] || "",
      },
    });

    const contentType = upstreamRes.headers.get("content-type") || "";

    if (
      contentType.includes("application/vnd.apple.mpegurl") ||
      path.endsWith(".m3u8")
    ) {
      const originalText = await upstreamRes.text();
      const origin = `${req.headers["x-forwarded-proto"] || "https"}://${req.headers.host}`;

      // إعادة كتابة الروابط الداخلية
      const rewritten = originalText.replace(
        /^(?!#)(.*\.m3u8|.*\.ts|.*\.key)(\?.*)?$/gm,
        (line) => {
          const cleanLine = line.split("?")[0];
          return `${origin}/${cleanLine}`;
        }
      );

      res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
      res.setHeader("Access-Control-Allow-Origin", "*");
      return res.status(200).send(rewritten);
    }

    // ملفات ts أو key مباشرة
    res.setHeader("Content-Type", contentType || "application/octet-stream");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");

    upstreamRes.body.pipe(res);
  } catch (err) {
    return res.status(502).send("Proxy Error");
  }
}
