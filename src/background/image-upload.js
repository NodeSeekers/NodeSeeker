async function uploadImage(payload) {
  if (!payload || (!payload.dataUrl && !(payload.blob instanceof Blob))) {
    throw new Error("没有可上传的图片数据");
  }

  const options = await getOptions();
  if (options.imageUploadEnabled === false) {
    throw new Error("图床上传已关闭");
  }

  const blob = payload.blob instanceof Blob ? payload.blob : dataUrlToBlob(payload.dataUrl);
  const fileName = payload.name || `nodeseek-${Date.now()}.${mimeToExt(blob.type)}`;
  const file = new File([blob], fileName, {
    type: blob.type || payload.type || "application/octet-stream"
  });
  const uploadFieldName = options.uploadFieldName || DEFAULT_OPTIONS.uploadFieldName;
  const formData = new FormData();
  formData.append(uploadFieldName, file, fileName);

  const apiKey = String(options.apiKey || "").trim();
  let apiResponse = null;
  let apiResponseText = "";
  let apiRequestError = "";

  if (apiKey) {
    try {
      apiResponse = await fetch(DEFAULT_OPTIONS.uploadEndpoint, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "X-API-Key": apiKey
        },
        body: formData,
        credentials: "omit",
        redirect: "error"
      });
      apiResponseText = await apiResponse.text();
    } catch (error) {
      apiRequestError = String(error?.message || error || "网络请求失败");
    }
  } else {
    apiRequestError = "未配置 NodeImage API Key";
  }

  let imageUrl = "";
  if (apiResponse?.ok) {
    const responseBody = parseResponse(apiResponseText);
    imageUrl = extractImageUrl(responseBody);
    if (!imageUrl) {
      throw new Error("API 上传成功，但响应中没有识别到图片 URL");
    }
  } else {
    const apiFailure = apiResponse
      ? formatHttpError(apiResponse, parseResponse(apiResponseText), apiResponseText, file)
      : apiRequestError;
    try {
      imageUrl = await uploadImageViaNodeImagePage(file, uploadFieldName);
    } catch (error) {
      const cookieFailure = String(error?.message || error || "未知错误").slice(0, 240);
      throw new Error(`API 上传失败：${apiFailure}；Cookie 回退失败：${cookieFailure}`);
    }
  }

  return {
    imageUrl,
    markdown: `![${options.markdownAltText || DEFAULT_OPTIONS.markdownAltText}](${imageUrl})`
  };
}

async function uploadImageViaNodeImagePage(file, fieldName) {
  const fileBytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  for (let offset = 0; offset < fileBytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...fileBytes.subarray(offset, offset + 0x8000));
  }
  const base64 = btoa(binary);
  let temporaryTabId = 0;

  try {
    const matchingTabs = await chrome.tabs.query({ url: "https://www.nodeimage.com/*" });
    let tab = matchingTabs.find((candidate) => candidate.status === "complete") || matchingTabs[0] || null;
    if (!tab) {
      tab = await chrome.tabs.create({ url: "https://www.nodeimage.com/", active: false });
      temporaryTabId = Number(tab.id) || 0;
      await waitForNodeImageTab(temporaryTabId);
    } else if (tab.status !== "complete") {
      await waitForNodeImageTab(Number(tab.id));
    }

    const executions = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: "MAIN",
      func: async ({ base64Value, imageName, mimeType, formFieldName }) => {
        if (location.hostname !== "www.nodeimage.com") {
          throw new Error("NodeImage 页面来源不匹配");
        }
        const binaryValue = atob(base64Value);
        const bytes = new Uint8Array(binaryValue.length);
        for (let index = 0; index < binaryValue.length; index += 1) {
          bytes[index] = binaryValue.charCodeAt(index);
        }
        let imageFile = new File([bytes], imageName, { type: mimeType });
        if (/^image\/(?:png|jpeg)$/i.test(mimeType)) {
          if (typeof createImageBitmap !== "function") {
            throw new Error("当前浏览器无法转换 PNG/JPEG 图片");
          }
          const bitmap = await createImageBitmap(imageFile);
          try {
            const canvas = document.createElement("canvas");
            canvas.width = bitmap.width;
            canvas.height = bitmap.height;
            const context = canvas.getContext("2d");
            if (!context) throw new Error("无法转换图片格式");
            context.drawImage(bitmap, 0, 0);
            const webpBlob = await new Promise((resolve, reject) => {
              canvas.toBlob((blob) => {
                if (blob) resolve(blob);
                else reject(new Error("PNG/JPEG 转 WebP 失败"));
              }, "image/webp");
            });
            if (webpBlob.type !== "image/webp") {
              throw new Error("当前浏览器无法转换为 WebP");
            }
            const baseName = imageName.replace(/\.[^.]+$/, "") || "nodeseeker-image";
            imageFile = new File([webpBlob], `${baseName}.webp`, { type: "image/webp" });
          } finally {
            bitmap.close?.();
          }
        }
        const formData = new FormData();
        formData.append(formFieldName, imageFile, imageFile.name);
        const response = await fetch("https://api.nodeimage.com/upload", {
          method: "POST",
          headers: { "Accept": "application/json" },
          body: formData,
          credentials: "include",
          redirect: "error"
        });
        return {
          ok: response.ok,
          status: response.status,
          statusText: response.statusText,
          contentType: response.headers.get("content-type") || "",
          responseText: (await response.text()).slice(0, 4000),
          fileName: imageFile.name,
          fileType: imageFile.type,
          fileSize: imageFile.size
        };
      },
      args: [{
        base64Value: base64,
        imageName: file.name,
        mimeType: file.type,
        formFieldName: fieldName
      }]
    });
    const result = executions[0]?.result;
    if (!result) throw new Error("未收到 NodeImage 页面上传结果");

    const responseBody = parseResponse(result.responseText || "");
    if (!result.ok) {
      const response = {
        status: result.status,
        statusText: result.statusText,
        headers: { get: () => result.contentType }
      };
      const uploadedFile = {
        name: result.fileName || file.name,
        type: result.fileType || file.type,
        size: Number(result.fileSize) || file.size
      };
      throw new Error(formatHttpError(response, responseBody, result.responseText || "", uploadedFile));
    }

    const imageUrl = extractImageUrl(responseBody);
    if (!imageUrl) throw new Error("网页登录态上传成功，但响应中没有识别到图片 URL");
    return imageUrl;
  } finally {
    if (temporaryTabId) await chrome.tabs.remove(temporaryTabId).catch(() => {});
  }
}

async function waitForNodeImageTab(tabId) {
  await new Promise((resolve, reject) => {
    let settled = false;
    let timeoutId = 0;
    const finish = (error = null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      chrome.tabs.onUpdated.removeListener(handleUpdated);
      if (error) reject(error);
      else resolve();
    };
    const handleUpdated = (updatedTabId, changeInfo) => {
      if (updatedTabId === tabId && changeInfo.status === "complete") finish();
    };

    timeoutId = setTimeout(() => finish(new Error("等待 NodeImage 页面加载超时")), 15000);
    chrome.tabs.onUpdated.addListener(handleUpdated);
    chrome.tabs.get(tabId).then((tab) => {
      if (tab.status === "complete") finish();
    }).catch(finish);
  });
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
  const contentType = String(response.headers?.get?.("content-type") || "");
  const isHtmlResponse = /text\/html/i.test(contentType) || /<!doctype\s+html|<html[\s>]/i.test(responseText);
  const responseSnippet = isHtmlResponse
    ? "图床返回 HTML 错误页"
    : serverMessage || compactText(responseText);
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
