let imagePreviewOverlay = null;
let imagePreviewItems = [];
let imagePreviewIndex = -1;
let imagePreviewScale = 1;

function initImagePreview() {
  document.addEventListener("click", handleImagePreviewClick, true);
  document.addEventListener("keydown", handleImagePreviewKeyDown, true);
}

function handleImagePreviewClick(event) {
  if (!featureOptions.imagePreviewEnabled || event.defaultPrevented || event.button !== 0) return;
  const image = toElement(event.target)?.closest?.(".post-content img, .comment-content img");
  if (!image || image.closest(".avatar-wrapper, .user-head, .nsh-profile-user-actions, .nsh-image-preview")) return;
  if (!image.currentSrc && !image.src) return;

  const root = image.closest(".post-content, .comment-content") || document;
  imagePreviewItems = Array.from(root.querySelectorAll(".post-content img, .comment-content img"))
    .filter((item) => item.isConnected && !item.closest(".avatar-wrapper, .user-head") && (item.currentSrc || item.src));
  imagePreviewIndex = imagePreviewItems.indexOf(image);
  if (imagePreviewIndex < 0) return;

  event.preventDefault();
  event.stopPropagation();
  showImagePreview();
}

function ensureImagePreviewOverlay() {
  if (imagePreviewOverlay?.isConnected) return imagePreviewOverlay;

  const overlay = document.createElement("div");
  overlay.className = "nsh-image-preview";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "图片预览");
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) closeImagePreview();
  });

  const toolbar = document.createElement("div");
  toolbar.className = "nsh-image-preview-toolbar";
  const counter = document.createElement("span");
  counter.className = "nsh-image-preview-counter";
  const zoomOut = createImagePreviewButton("−", "缩小", () => setImagePreviewScale(imagePreviewScale / 1.25));
  const zoomIn = createImagePreviewButton("+", "放大", () => setImagePreviewScale(imagePreviewScale * 1.25));
  const reset = createImagePreviewButton("适应", "适应窗口", () => setImagePreviewScale(1));
  const close = createImagePreviewButton("×", "关闭", closeImagePreview);
  toolbar.append(counter, zoomOut, zoomIn, reset, close);

  const previous = createImagePreviewButton("‹", "上一张", () => moveImagePreview(-1));
  previous.classList.add("nsh-image-preview-nav", "nsh-image-preview-previous");
  const next = createImagePreviewButton("›", "下一张", () => moveImagePreview(1));
  next.classList.add("nsh-image-preview-nav", "nsh-image-preview-next");

  const image = document.createElement("img");
  image.className = "nsh-image-preview-image";
  image.alt = "";
  image.addEventListener("wheel", handleImagePreviewWheel, { passive: false });
  overlay.append(toolbar, previous, image, next);
  document.body.appendChild(overlay);
  imagePreviewOverlay = overlay;
  return overlay;
}

function createImagePreviewButton(label, title, action) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "nsh-image-preview-button";
  button.textContent = label;
  button.title = title;
  button.setAttribute("aria-label", title);
  button.addEventListener("click", action);
  return button;
}

function showImagePreview() {
  const overlay = ensureImagePreviewOverlay();
  const source = imagePreviewItems[imagePreviewIndex];
  if (!source) return closeImagePreview();

  imagePreviewScale = 1;
  const preview = overlay.querySelector(".nsh-image-preview-image");
  preview.src = source.currentSrc || source.src;
  preview.alt = source.alt || "帖子图片";
  preview.style.transform = "scale(1)";
  overlay.querySelector(".nsh-image-preview-counter").textContent = `${imagePreviewIndex + 1} / ${imagePreviewItems.length}`;
  overlay.classList.add("is-open");
  document.documentElement.classList.add("nsh-image-preview-open");
  overlay.querySelector(".nsh-image-preview-button[aria-label='关闭']")?.focus();
}

function moveImagePreview(delta) {
  if (imagePreviewItems.length < 2) return;
  imagePreviewIndex = (imagePreviewIndex + delta + imagePreviewItems.length) % imagePreviewItems.length;
  showImagePreview();
}

function setImagePreviewScale(scale) {
  imagePreviewScale = Math.max(0.25, Math.min(5, scale));
  const image = imagePreviewOverlay?.querySelector(".nsh-image-preview-image");
  if (image) image.style.transform = `scale(${imagePreviewScale})`;
}

function handleImagePreviewWheel(event) {
  event.preventDefault();
  setImagePreviewScale(imagePreviewScale * (event.deltaY < 0 ? 1.1 : 1 / 1.1));
}

function handleImagePreviewKeyDown(event) {
  if (!imagePreviewOverlay?.classList.contains("is-open")) return;
  if (event.key === "Escape") closeImagePreview();
  if (event.key === "ArrowLeft") moveImagePreview(-1);
  if (event.key === "ArrowRight") moveImagePreview(1);
  if (event.key === "+" || event.key === "=") setImagePreviewScale(imagePreviewScale * 1.25);
  if (event.key === "-") setImagePreviewScale(imagePreviewScale / 1.25);
}

function closeImagePreview() {
  imagePreviewOverlay?.classList.remove("is-open");
  document.documentElement.classList.remove("nsh-image-preview-open");
  imagePreviewOverlay?.querySelector(".nsh-image-preview-image")?.removeAttribute("src");
  imagePreviewItems = [];
  imagePreviewIndex = -1;
}
