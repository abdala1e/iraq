export default async function handler(req, res) {
  const { url } = req;
  let path = url.replace("/", "");

  if (path === "" || path === "iraq.m3u8") {
    path = "playlist.m3u8";
  }

  const base = "https://svs.itworkscdn.net/smc4sportslive/smc4tv.smil/";

  const targetUrl = base + path;

  const fetchRes = await fetch(targetUrl, {
    headers: {
      "Referer": "https://www.shabakaty.com/",
      "Origin": "https://www.shabakaty.com/",
      "User-Agent": req.headers['user-agent'] || ""
    }
  });

  const contentType = fetchRes.headers.get("content-type") || "application/octet-stream";

  // تعديل روابط m3u8
  if (contentType.includes("application/vnd.apple.mpegurl") || path.endsWith(".m3u8")) {
    const body = await fetchRes.text();

    const origin = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`;

    const rewritten = body.replace(
      /^(?!#)(.*\.m3u8|.*\.ts|.*\.key)(\?.*)?$/gm,
      (line) => `${origin}/${line.split("?")[0]}`
    );

    res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(200).send(rewritten);
  }

  res.setHeader("Content-Type", contentType);
  res.setHeader("Access-Control-Allow-Origin", "*");

  fetchRes.body.pipe(res);
}
