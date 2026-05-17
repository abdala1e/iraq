import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

serve(async (req) => {
  const url = new URL(req.url);
  const playlistUrl = url.searchParams.get("playlist_url");
  const vidUrl = url.searchParams.get("vid_url");

  // ترويسات كسر الحماية الأمنية للمشغلات وتويتر
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    "Access-Control-Allow-Headers": "*",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // تزوير الهوية بالكامل أمام سيرفر الـ IPTV
  const headers = new Headers({
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "*/*",
    "Connection": "keep-alive",
  });

  // [الوضع 1]: جلب القائمة وإعادة صياغة الروابط داخلياً لتعمل عبر نفس الآي بي لقفل الجلسة
  if (playlistUrl) {
    try {
      const res = await fetch(playlistUrl, { headers });
      const text = await res.text();
      
      const playlistObj = new URL(playlistUrl);
      const baseUrl = playlistObj.protocol + "//" + playlistObj.host + playlistObj.pathname.substring(0, playlistObj.pathname.lastIndexOf('/') + 1);

      const lines = text.split("\n");
      const newLines = lines.map(line => {
        line = line.trim();
        if (line === "" || line.startsWith("#")) {
          if (line.toUpperCase().includes('URI="')) {
            return line.replace(/URI="([^"]+)"/i, (_, p1) => {
              let fullUrl = p1.startsWith("http") ? p1 : (p1.startsWith("/") ? playlistObj.protocol + "//" + playlistObj.host + p1 : baseUrl + p1);
              return `URI="${url.origin}?playlist_url=${encodeURIComponent(fullUrl)}"`;
            });
          }
          return line;
        }
        let fullUrl = line.startsWith("http") ? line : (line.startsWith("/") ? playlistObj.protocol + "//" + playlistObj.host + line : baseUrl + line);
        return `${url.origin}?vid_url=${encodeURIComponent(fullUrl)}`;
      });

      return new Response(newLines.join("\n"), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/vnd.apple.mpegurl",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        }
      });
    } catch (e) {
      return new Response("Error: " + e.message, { status: 500, headers: corsHeaders });
    }
  }

  // [الوضع 2]: تمرير فيديو الـ TS بدعم الـ Range وبأداء صارخ السرعة
  if (vidUrl) {
    try {
      if (req.headers.has("range")) {
        headers.set("range", req.headers.get("range")!);
      }
      const targetObj = new URL(vidUrl);
      headers.set("Origin", targetObj.protocol + "//" + targetObj.host);
      headers.set("Referer", targetObj.protocol + "//" + targetObj.host + "/");

      const res = await fetch(vidUrl, { headers });
      
      const responseHeaders = new Headers(res.headers);
      Object.entries(corsHeaders).forEach(([key, value]) => responseHeaders.set(key, value));
      responseHeaders.set("Content-Type", "video/mp2t");

      return new Response(res.body, {
        status: res.status,
        statusText: res.statusText,
        headers: responseHeaders,
      });
    } catch (e) {
      return new Response("Error: " + e.message, { status: 500, headers: corsHeaders });
    }
  }

  return new Response("Invalid request", { status: 400, headers: corsHeaders });
});
