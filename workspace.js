'use strict';

// Render an independent copy so changing export settings never disturbs the editor.
function openImageExport() {
  if (!project) return;
  const dialog = $('#imageDialog');
  const image = $('#imageResult');
  const status = $('#imageStatus');
  const save = $('#imageSave');
  const selectors = [...dialog.querySelectorAll('select, input')];
  let revision = 0;
  let rendering = false;
  let closed = false;
  let result = null;
  let previewUrl = '';
  const title = diagram().name;

  function clearPreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = '';
    result = null;
    image.hidden = true;
    image.removeAttribute('src');
    save.disabled = true;
  }

  async function refresh() {
    revision++;
    clearPreview();
    status.textContent = tr('image.busy');
    if (rendering) return;
    rendering = true;
    try {
      while (!closed && dialog.open) {
        const requested = revision;
        const mode = $('#imageMode').value;
        const widthInput = $('#imageWidth');
        if (!widthInput.validity.valid) {
          status.textContent = tr('image.invalidWidth');
          return;
        }
        const width = widthInput.valueAsNumber;
        const fontScale = Number($('#imageFont').value);
        const jpeg = $('#imageFormat').value === 'JPEG';
        const stage = document.createElement('div');
        stage.className = 'export-stage';
        stage.dataset.mode = mode;
        stage.setAttribute('aria-hidden', 'true');
        stage.append($('#diagram .struct').cloneNode(true));
        document.body.append(stage);
        try {
          stage.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
          await document.fonts.ready;
          // Keep the layout width stable as text grows; rows can wrap and gain height.
          stage.style.width = Math.max(640, stage.offsetWidth) + 'px';
          stage.style.fontSize = (parseFloat(getComputedStyle(stage).fontSize) * fontScale) + 'px';
          layoutDecisions(stage);
          const padding = parseFloat(getComputedStyle(stage).paddingRight);
          const contentWidth = stage.firstElementChild.getBoundingClientRect().width + 2 * padding;
          if (contentWidth > stage.offsetWidth) {
            stage.style.width = Math.ceil(contentWidth) + 'px';
            layoutDecisions(stage);
          }
          const scale = width / stage.offsetWidth;
          const height = Math.ceil(stage.offsetHeight * scale);
          if (width * height > 16777216 || Math.max(width, height) > 16384) throw new RangeError();
          // Embedded SVGs are rendered as standalone images by html2canvas.
          for (const svg of stage.querySelectorAll('svg')) {
            const bounds = svg.getBoundingClientRect();
            svg.setAttribute('width', bounds.width);
            svg.setAttribute('height', bounds.height);
            for (const shape of svg.querySelectorAll('line, path')) {
              const style = getComputedStyle(shape);
              shape.setAttribute('stroke', style.stroke);
              shape.setAttribute('stroke-width', style.strokeWidth);
              shape.setAttribute('fill', 'none');
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          await html2canvas(stage, {
            canvas,
            backgroundColor: getComputedStyle(stage).backgroundColor,
            scale, logging: false, width: stage.offsetWidth, height: stage.offsetHeight,
          });
          const blob = await new Promise(resolve => canvas.toBlob(resolve, jpeg ? 'image/jpeg' : 'image/png', .95));
          if (!blob) throw new Error('Encoding failed');
          if (revision === requested && dialog.open) {
            result = blob;
            previewUrl = URL.createObjectURL(blob);
            image.src = previewUrl;
            image.hidden = false;
            status.textContent = width + ' × ' + height + ' px';
            save.disabled = false;
          }
        } catch (error) {
          if (revision === requested && dialog.open) status.textContent = tr(error instanceof RangeError ? 'image.large' : 'msg.imageFailed');
        } finally {
          stage.remove();
        }
        if (revision === requested) break;
      }
    } finally {
      rendering = false;
    }
  }

  selectors.forEach(select => select.oninput = refresh);
  save.onclick = () => {
    if (result) download(result, title + (result.type === 'image/jpeg' ? '.jpg' : '.png'));
  };
  dialog.addEventListener('close', () => {
    closed = true;
    revision++;
    selectors.forEach(select => select.oninput = null);
    save.onclick = null;
    clearPreview();
  }, { once: true });
  dialog.showModal();
  refresh();
}

(() => {
  const grip = $('#sidebarGrip');
  const sidebar = $('#sidebar');
  const storageKey = 'structorizer.sidebar.width';
  let preferred = null;
  try { preferred = Number(localStorage.getItem(storageKey)) || null; } catch {}
  let pointer = null;
  let offset = 0;
  const minimum = () => Math.min(144, Math.floor(innerWidth * .45));
  const maximum = () => Math.max(minimum(), Math.min(520, Math.floor(innerWidth * .60)));
  function update() {
    if (preferred) sidebar.style.setProperty('--sidebar-width', Math.min(maximum(), Math.max(minimum(), preferred)) + 'px');
    grip.setAttribute('aria-valuemin', minimum());
    grip.setAttribute('aria-valuemax', maximum());
    grip.setAttribute('aria-valuenow', sidebar.offsetWidth);
  }
  function persist() {
    try { localStorage.setItem(storageKey, preferred); } catch {}
  }
  grip.onpointerdown = event => {
    if (event.button !== 0 || pointer !== null) return;
    pointer = event.pointerId;
    offset = event.clientX - sidebar.offsetWidth;
    grip.setPointerCapture(pointer);
    document.body.classList.add('resizing');
  };
  grip.onpointermove = event => {
    if (event.pointerId !== pointer) return;
    preferred = Math.min(maximum(), Math.max(minimum(), event.clientX - offset));
    update();
  };
  grip.onlostpointercapture = () => {
    pointer = null;
    document.body.classList.remove('resizing');
    if (preferred) persist();
  };
  grip.onkeydown = event => {
    const step = event.shiftKey ? 32 : 8;
    const widths = { ArrowLeft: sidebar.offsetWidth - step, ArrowRight: sidebar.offsetWidth + step, Home: minimum(), End: maximum() };
    if (!(event.key in widths)) return;
    event.preventDefault();
    preferred = Math.max(minimum(), Math.min(maximum(), widths[event.key]));
    update();
    persist();
  };
  addEventListener('resize', update);
  update();
})();
