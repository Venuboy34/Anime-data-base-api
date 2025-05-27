// index.js
export default {
  async fetch(req) {
    const url = new URL(req.url);
    const query = url.searchParams.get("query");

    if (!query) {
      return new Response(JSON.stringify({
        status: "error",
        message: "Missing query. Use ?query=Naruto Season 1"
      }), { headers: { "Content-Type": "application/json" }, status: 400 });
    }

    const searchUrl = `https://anitaku.to/search.html?keyword=${encodeURIComponent(query)}`;
    const searchRes = await fetch(searchUrl);
    const searchHtml = await searchRes.text();

    const animeMatch = searchHtml.match(/<a href="\/category\/([^"]+)"/);
    if (!animeMatch) {
      return new Response(JSON.stringify({
        status: "error",
        message: "Anime not found on anitaku.to"
      }), { headers: { "Content-Type": "application/json" }, status: 404 });
    }

    const slug = animeMatch[1];
    const animeUrl = `https://anitaku.to/category/${slug}`;
    const animePage = await fetch(animeUrl).then(res => res.text());
    const episodesJson = animePage.match(/var episodes = (.*?);/);

    if (!episodesJson) {
      return new Response(JSON.stringify({
        status: "error",
        message: "Episodes not found"
      }), { headers: { "Content-Type": "application/json" }, status: 404 });
    }

    const episodes = JSON.parse(episodesJson[1]).reverse();

    const data = episodes.map(ep => ({
      title: `Episode ${ep.episode}`,
      number: ep.episode,
      stream_url: `https://anitaku.to/watch/${slug}-episode-${ep.episode}`,
      download_url: `https://anitaku.to/download/${slug}-episode-${ep.episode}`
    }));

    return new Response(JSON.stringify({
      status: "success",
      message: "Anime Database is running",
      anime: query,
      total_episodes: data.length,
      episodes: data
    }, null, 2), { headers: { "Content-Type": "application/json" } });
  }
};
