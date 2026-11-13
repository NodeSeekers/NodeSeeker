function openNshConfirmDialog({
  title,
  message,
  confirmText = "确定",
  cancelText = "取消",
  confirmClassName = "nsh-dialog-primary"
}) {
  return new Promise((resolve) => {
    const backdrop = document.createElement("div");
    backdrop.className = "nsh-dialog-backdrop";

    const dialog = document.createElement("section");
    dialog.className = "nsh-dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");

    const titleElement = document.createElement("h2");
    titleElement.textContent = title;
    dialog.appendChild(titleElement);

    const messageElement = document.createElement("p");
    messageElement.textContent = message;
    dialog.appendChild(messageElement);

    const actions = document.createElement("div");
    actions.className = "nsh-dialog-actions";

    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.textContent = cancelText;

    const confirmButton = document.createElement("button");
    confirmButton.type = "button";
    confirmButton.className = confirmClassName;
    confirmButton.textContent = confirmText;

    const close = (confirmed) => {
      document.removeEventListener("keydown", handleKeyDown);
      backdrop.remove();
      resolve(confirmed);
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        close(false);
      }
    };

    cancelButton.addEventListener("click", () => close(false));
    confirmButton.addEventListener("click", () => close(true));
    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop) {
        close(false);
      }
    });
    document.addEventListener("keydown", handleKeyDown);

    actions.appendChild(cancelButton);
    actions.appendChild(confirmButton);
    dialog.appendChild(actions);
    backdrop.appendChild(dialog);
    document.body.appendChild(backdrop);
    cancelButton.focus();
  });
}
