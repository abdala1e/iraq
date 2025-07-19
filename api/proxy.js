export default async function handler(req, res) {
  const { url } = req;
  let path = url.replace("/", "");

  if (!path || path === "iraq.m3u8") {
    path = "playlist.m3u8";
  }

  const base = "https://svs.itworkscdn.net/smc4sportslive/smc4tv.smil/";
  const targetUrl = base + path;

  const upstreamRes = await fetch(targetUrl, {
    headers: {
      "Referer": "https://www.shabakaty.com/",
      "Origin": "https://www.shabakaty.com/",
      "User-Agent": req.headers['user-agent'] || "",
    }
  });

  const contentType = upstreamRes.headers.get("content-type") || "";

  if (
    contentType.includes("application/vnd.apple.mpegurl") ||
    path.endsWith(".m3u8")
  ) {
    const originalText = await upstreamRes.text();
    const origin = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`;

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

  // تمرير الفيديو (ts, key...) بالرؤوس المطلوبة
  res.setHeader("Content-Type", contentType || "application/octet-stream");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");

  upstreamRes.body.pipe(res);
}
