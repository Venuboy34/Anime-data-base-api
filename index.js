export default {
  async fetch(request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query");

    const headers = {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    };

    if (!query) {
      return new Response(JSON.stringify({ error: "Missing query parameter" }), {
        headers,
        status: 400,
      });
    }

    try {
      const result = await scrapeAnitaku(query.toLowerCase());
      return new Response(JSON.stringify(result), { headers });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        headers,
        status: 500,
      });
    }
  },
};

async function scrapeAnitaku(query) {
  const [titlePart, episodePart] = query.split("/episode");
  const episode = episodePart ? episodePart.trim() : "";
  const title = titlePart.trim().replace(/\s+/g, " ");

  const searchUrl = `https://anitaku.io/search.html?keyword=${encodeURIComponent(title)}`;
  const res = await fetch(searchUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:117.0) Gecko/20100101 Firefox/117.0",
    },
  });
  const html = await res.text();

  const regex = new RegExp(`<a href="(/anime/[^"]+)"[^>]*title="([^"]+)"`, "gi");
  let match;
  while ((match = regex.exec(html))) {
    const link = match[1];
    const name = match[2];
    if (name.toLowerCase().includes(title)) {
      const animePage = `https://anitaku.io${link}`;
      const episodePage = `${animePage.replace(".html", "")}-episode-${episode}.html`;

      const epRes = await fetch(episodePage, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:117.0) Gecko/20100101 Firefox/117.0",
        },
      });
      const epHtml = await epRes.text();

      const m3u8Match = epHtml.match(/file: ["'](https?:\/\/[^"']+\.m3u8)["']/);
      const thumbMatch = epHtml.match(/poster: ["'](https?:\/\/[^"']+)["']/);

      if (m3u8Match) {
        return {
          source: "anitaku.io",
          title: `${name} - Episode ${episode}`,
          thumbnail: thumbMatch ? thumbMatch[1] : null,
          stream_links: [{ quality: "Auto", url: m3u8Match[1] }],
          download_link: m3u8Match[1],
        };
      }

      throw new Error("Streaming link not found for this episode.");
    }
  }

  throw new Error("Anime not found.");
}
