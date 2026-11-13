const SHORT_LINK_RESOLUTION_HOSTS = new Set([
  "bit.ly", "t.co", "t.cn", "ow.ly", "is.gd", "buff.ly", "tinyurl.com", "shorturl.at", "rebrand.ly", "b23.tv"
]);

async function resolveShortLink(payload) {
  let url;
  try { url = new URL(payload?.url || ""); } catch (_error) { throw new Error("短链地址无效"); }
  if (!SHORT_LINK_RESOLUTION_HOSTS.has(url.hostname.toLowerCase()) || !/^https?:$/.test(url.protocol)) {
    throw new Error("暂不支持解析该短链域名");
  }
  const response = await fetch(url.href, {
    method: "HEAD",
    redirect: "follow",
    credentials: "omit",
    cache: "no-store",
    signal: AbortSignal.timeout(10000)
  });
  const finalUrl = new URL(response.url || url.href);
  if (!/^https?:$/.test(finalUrl.protocol)) throw new Error("短链目标协议不安全");
  return { url: finalUrl.href };
}
