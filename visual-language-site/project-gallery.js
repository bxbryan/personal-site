(() => {
  const images = [...document.querySelectorAll(".image-stack img")];
  if (images.length === 0) return;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const lightbox = document.createElement("div");
  lightbox.className = "gallery-lightbox";
  lightbox.setAttribute("role", "dialog");
  lightbox.setAttribute("aria-modal", "true");
  lightbox.setAttribute("aria-label", "Project image gallery");
  lightbox.innerHTML = `
    <div class="gallery-stage">
      <img class="gallery-image" alt="">
    </div>
    <button class="gallery-close" type="button" aria-label="Close gallery">&times;</button>
    <button class="gallery-nav gallery-prev" type="button" aria-label="Previous image">&lsaquo;</button>
    <button class="gallery-nav gallery-next" type="button" aria-label="Next image">&rsaquo;</button>
    <div class="gallery-counter" aria-live="polite"></div>
  `;
  document.body.appendChild(lightbox);

  const stage = lightbox.querySelector(".gallery-stage");
  const galleryImage = lightbox.querySelector(".gallery-image");
  const closeButton = lightbox.querySelector(".gallery-close");
  const prevButton = lightbox.querySelector(".gallery-prev");
  const nextButton = lightbox.querySelector(".gallery-next");
  const counter = lightbox.querySelector(".gallery-counter");

  let index = 0;
  let isOpen = false;
  let rafId = null;
  let isDragging = false;
  let dragX = 0;
  let dragY = 0;
  let scale = 1;
  let targetScale = 1;
  let panX = 0;
  let panY = 0;
  let targetPanX = 0;
  let targetPanY = 0;

  function resetView() {
    scale = 1;
    targetScale = 1;
    panX = 0;
    panY = 0;
    targetPanX = 0;
    targetPanY = 0;
    updateTransform();
  }

  function updateTransform() {
    galleryImage.style.transform = `translate3d(${panX.toFixed(2)}px, ${panY.toFixed(2)}px, 0) scale(${scale.toFixed(4)})`;
  }

  function animate() {
    if (!isOpen) {
      rafId = null;
      return;
    }

    if (targetScale <= 1.01 && !isDragging) {
      targetScale = 1;
      targetPanX = 0;
      targetPanY = 0;
    }

    scale += (targetScale - scale) * 0.16;
    panX += (targetPanX - panX) * 0.16;
    panY += (targetPanY - panY) * 0.16;

    if (Math.abs(targetScale - scale) < 0.001) scale = targetScale;
    if (Math.abs(targetPanX - panX) < 0.05) panX = targetPanX;
    if (Math.abs(targetPanY - panY) < 0.05) panY = targetPanY;

    updateTransform();
    rafId = requestAnimationFrame(animate);
  }

  function startAnimation() {
    if (!rafId) rafId = requestAnimationFrame(animate);
  }

  function setImage(nextIndex) {
    index = (nextIndex + images.length) % images.length;
    const source = images[index];
    galleryImage.src = source.currentSrc || source.src;
    galleryImage.alt = source.alt || "";
    counter.textContent = `${index + 1} / ${images.length}`;
    resetView();
  }

  function openGallery(nextIndex) {
    isOpen = true;
    setImage(nextIndex);
    lightbox.classList.add("is-open");
    document.body.classList.add("gallery-open");
    closeButton.focus({ preventScroll: true });
    startAnimation();
  }

  function closeGallery() {
    isOpen = false;
    isDragging = false;
    stage.classList.remove("is-dragging");
    lightbox.classList.remove("is-open");
    document.body.classList.remove("gallery-open");
  }

  function stepImage(direction) {
    setImage(index + direction);
  }

  function zoomAt(clientX, clientY, nextScale) {
    const rect = stage.getBoundingClientRect();
    const cursorX = clientX - rect.left - rect.width / 2;
    const cursorY = clientY - rect.top - rect.height / 2;
    const previousScale = targetScale;

    targetScale = clamp(nextScale, 1, 6);
    const ratio = targetScale / previousScale;
    targetPanX = cursorX - (cursorX - targetPanX) * ratio;
    targetPanY = cursorY - (cursorY - targetPanY) * ratio;
    startAnimation();
  }

  images.forEach((image, imageIndex) => {
    image.addEventListener("click", () => openGallery(imageIndex));
  });

  closeButton.addEventListener("click", closeGallery);
  prevButton.addEventListener("click", () => stepImage(-1));
  nextButton.addEventListener("click", () => stepImage(1));

  lightbox.addEventListener("wheel", event => {
    if (!isOpen) return;
    event.preventDefault();
    const wheelStrength = event.deltaMode === 1 ? 0.05 : 0.0015;
    const nextScale = targetScale * Math.exp(-event.deltaY * wheelStrength);
    zoomAt(event.clientX, event.clientY, nextScale);
  }, { passive: false });

  stage.addEventListener("pointerdown", event => {
    if (!isOpen || event.button !== 0 || targetScale <= 1.01) return;
    isDragging = true;
    dragX = event.clientX;
    dragY = event.clientY;
    stage.classList.add("is-dragging");
    stage.setPointerCapture(event.pointerId);
  });

  stage.addEventListener("pointermove", event => {
    if (!isDragging) return;
    targetPanX += event.clientX - dragX;
    targetPanY += event.clientY - dragY;
    dragX = event.clientX;
    dragY = event.clientY;
    startAnimation();
  });

  stage.addEventListener("pointerup", event => {
    isDragging = false;
    stage.classList.remove("is-dragging");
    if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId);
  });

  stage.addEventListener("pointercancel", event => {
    isDragging = false;
    stage.classList.remove("is-dragging");
    if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId);
  });

  stage.addEventListener("dblclick", event => {
    if (targetScale > 1.2) {
      targetScale = 1;
      targetPanX = 0;
      targetPanY = 0;
    } else {
      zoomAt(event.clientX, event.clientY, 2.4);
    }
    startAnimation();
  });

  window.addEventListener("keydown", event => {
    if (!isOpen) return;

    if (["Escape", "ArrowLeft", "ArrowRight", "+", "=", "-", "0"].includes(event.key)) {
      event.preventDefault();
    }

    if (event.key === "Escape") closeGallery();
    if (event.key === "ArrowLeft") stepImage(-1);
    if (event.key === "ArrowRight") stepImage(1);
    if (event.key === "+" || event.key === "=") {
      const rect = stage.getBoundingClientRect();
      zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, targetScale * 1.22);
    }
    if (event.key === "-") {
      const rect = stage.getBoundingClientRect();
      zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, targetScale / 1.22);
    }
    if (event.key === "0") {
      targetScale = 1;
      targetPanX = 0;
      targetPanY = 0;
      startAnimation();
    }
  });
})();
