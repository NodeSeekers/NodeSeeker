async function uploadImage(payload) {
  if (!payload || !payload.dataUrl) {
    throw new Error("没有可上传的图片数据");
  }

  const options = await getOptions();
  if (options.imageUploadEnabled === false) {
    throw new Error("图床上传已关闭");
  }

  if (!options.apiKey.trim()) {
    throw new Error("请先在扩展选项页填写 Nodeimage API Key");
  }

  const blob = dataUrlToBlob(payload.dataUrl);
  const fileName = payload.name || `nodeseek-${Date.now()}.${mimeToExt(blob.type)}`;
  const file = new File([blob], fileName, {
    type: blob.type || payload.type || "application/octet-stream"
  });
  const formData = new FormData();
  formData.append(options.uploadFieldName || DEFAULT_OPTIONS.uploadFieldName, file, fileName);

  const response = await fetch(DEFAULT_OPTIONS.uploadEndpoint, {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "X-API-Key": options.apiKey.trim()
    },
    body: formData,
    credentials: "omit",
    redirect: "error"
  });

  const responseText = await response.text();
  const responseBody = parseResponse(responseText);

  if (!response.ok) {
    throw new Error(formatHttpError(response, responseBody, responseText, file));
  }

  const imageUrl = extractImageUrl(responseBody);
  if (!imageUrl) {
    throw new Error("上传成功，但响应中没有识别到图片 URL");
  }

  return {
    imageUrl,
    markdown: `![${options.markdownAltText || DEFAULT_OPTIONS.markdownAltText}](${imageUrl})`
  };
}

function dataUrlToBlob(dataUrl) {
  const match = dataUrl.match(/^data:([^;,]+)?(;base64)?,(.*)$/);
  if (!match) {
    throw new Error("图片数据格式不正确");
  }

  const mimeType = match[1] || "application/octet-stream";
  const isBase64 = Boolean(match[2]);
  const data = isBase64 ? atob(match[3]) : decodeURIComponent(match[3]);
  const bytes = new Uint8Array(data.length);

  for (let index = 0; index < data.length; index += 1) {
    bytes[index] = data.charCodeAt(index);
  }

  return new Blob([bytes], { type: mimeType });
}

function mimeToExt(mimeType) {
  const map = {
    "image/gif": "gif",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp"
  };
  return map[mimeType] || "png";
}

function parseResponse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function extractError(value) {
  if (typeof value === "string") {
    return value.length < 180 ? value : "";
  }

  if (!value || typeof value !== "object") {
    return "";
  }

  if (value.error || value.message || value.msg || value.detail) {
    return value.error || value.message || value.msg || value.detail;
  }

  if (value.data && typeof value.data === "object") {
    return extractError(value.data);
  }

  if (Array.isArray(value.errors)) {
    return value.errors.map((item) => extractError(item) || compactText(String(item))).filter(Boolean).join("; ");
  }

  return "";
}

function formatHttpError(response, responseBody, responseText, file) {
  const serverMessage = extractError(responseBody);
  const responseSnippet = serverMessage || compactText(responseText);
  const parts = [`上传失败：HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ""}`];

  if (responseSnippet) {
    parts.push(`响应：${responseSnippet}`);
  }

  parts.push(`文件：${file.type || "unknown"}，${formatBytes(file.size)}`);
  return parts.join("；");
}

function compactText(text) {
  return (text || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 240);
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) {
    return "unknown size";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function extractImageUrl(value) {
  if (typeof value === "string") {
    return extractUrlFromText(value);
  }

  if (!value || typeof value !== "object") {
    return "";
  }

  const preferredKeys = [
    "url",
    "image_url",
    "imageUrl",
    "src",
    "link",
    "markdown",
    "bbcode",
    "raw",
    "original"
  ];

  for (const key of preferredKeys) {
    if (typeof value[key] === "string") {
      const url = extractUrlFromText(value[key]);
      if (url) {
        return url;
      }
    }
  }

  for (const nested of Object.values(value)) {
    const url = extractImageUrl(nested);
    if (url) {
      return url;
    }
  }

  return "";
}

function extractUrlFromText(text) {
  const markdownUrl = text.match(/!\[[^\]]*]\((https?:\/\/[^)\s]+)\)/i);
  if (markdownUrl) {
    return markdownUrl[1];
  }

  const directUrl = text.match(/https?:\/\/[^\s"'<>)]*/i);
  return directUrl ? directUrl[0] : "";
}

function cleanText(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}
