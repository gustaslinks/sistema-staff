(function(){
  'use strict';

  const state = {
    input: null,
    file: null,
    image: null,
    imgEl: null,
    backdrop: null,
    stage: null,
    zoomRange: null,
    objectUrl: '',
    cropFile: null,
    scale: 1,
    minScale: 1,
    x: 0,
    y: 0,
    naturalW: 0,
    naturalH: 0,
    dragging: false,
    startX: 0,
    startY: 0,
    baseX: 0,
    baseY: 0,
    resolve: null,
    pointers: new Map(),
    pinchStartDistance: 0,
    pinchStartScale: 1,
    pinchBaseX: 0,
    pinchBaseY: 0,
    options: null
  };

  function $(id){ return document.getElementById(id); }

  function ensureModal(){
    if(state.backdrop) return;
    const backdrop = document.createElement('div');
    backdrop.className = 'photo-cropper-backdrop';
    backdrop.innerHTML = `
      <div class="photo-cropper-modal" role="dialog" aria-modal="true" aria-labelledby="photoCropperTitle">
        <div class="photo-cropper-header">
          <h3 id="photoCropperTitle">Ajustar foto de cadastro</h3>
          <p>Centralize seu rosto no círculo. Use uma foto real, legível e parecida com seu documento.</p>
        </div>
        <div class="photo-cropper-body">
          <div class="photo-cropper-stage" id="photoCropperStage">
            <img class="photo-cropper-image" id="photoCropperImage" alt="Foto para recorte">
            <div class="photo-cropper-frame"></div>
            <div class="photo-cropper-grid"></div>
          </div>
          <div class="photo-cropper-controls">
            <span>Menos</span>
            <input id="photoCropperZoom" type="range" min="1" max="3" step="0.01" value="1" aria-label="Zoom da foto">
            <span>Mais</span>
          </div>
          <p class="photo-cropper-help">Arraste a imagem para posicionar. No celular, use pinça para aproximar/afastar. O arquivo salvo será quadrado e comprimido para o cadastro.</p>
        </div>
        <div class="photo-cropper-actions">
          <button type="button" class="photo-cropper-btn secondary" id="photoCropperCancel">Cancelar</button>
          <button type="button" class="photo-cropper-btn primary" id="photoCropperSave">Usar esta foto</button>
        </div>
      </div>`;
    document.body.appendChild(backdrop);
    state.backdrop = backdrop;
    state.stage = $('photoCropperStage');
    state.imgEl = $('photoCropperImage');
    state.zoomRange = $('photoCropperZoom');

    $('photoCropperCancel').addEventListener('click', cancel);
    $('photoCropperSave').addEventListener('click', save);
    state.zoomRange.addEventListener('input', () => {
      state.scale = Number(state.zoomRange.value);
      clampPosition();
      applyTransform();
    });

    state.stage.addEventListener('pointerdown', (ev) => {
      ev.preventDefault();
      state.stage.setPointerCapture(ev.pointerId);
      state.pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      if(state.pointers.size === 1){
        state.dragging = true;
        state.startX = ev.clientX;
        state.startY = ev.clientY;
        state.baseX = state.x;
        state.baseY = state.y;
      } else if(state.pointers.size === 2){
        state.dragging = false;
        state.pinchStartDistance = pointerDistance();
        state.pinchStartScale = state.scale;
        state.pinchBaseX = state.x;
        state.pinchBaseY = state.y;
      }
    });
    state.stage.addEventListener('pointermove', (ev) => {
      if(!state.pointers.has(ev.pointerId)) return;
      ev.preventDefault();
      state.pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      if(state.pointers.size >= 2){
        const dist = pointerDistance();
        if(state.pinchStartDistance > 0){
          const nextScale = state.pinchStartScale * (dist / state.pinchStartDistance);
          state.scale = Math.min(Number(state.zoomRange.max), Math.max(Number(state.zoomRange.min), nextScale));
          state.zoomRange.value = String(state.scale);
          clampPosition();
          applyTransform();
        }
        return;
      }
      if(!state.dragging) return;
      state.x = state.baseX + ev.clientX - state.startX;
      state.y = state.baseY + ev.clientY - state.startY;
      clampPosition();
      applyTransform();
    });
    state.stage.addEventListener('pointerup', endDrag);
    state.stage.addEventListener('pointercancel', endDrag);
    state.stage.addEventListener('pointerleave', endDrag);
    backdrop.addEventListener('click', (ev) => { if(ev.target === backdrop) cancel(); });
  }

  function applyOptionsToModal(){
    const opts = state.options || {};
    const title = $('photoCropperTitle');
    const desc = document.querySelector('.photo-cropper-header p');
    const help = document.querySelector('.photo-cropper-help');
    const saveBtn = $('photoCropperSave');
    if(title) title.textContent = opts.title || 'Ajustar imagem';
    if(desc) desc.textContent = opts.description || '';
    if(help) help.textContent = opts.help || '';
    if(saveBtn) saveBtn.textContent = opts.saveText || 'Usar imagem';
    if(state.stage){
      state.stage.style.aspectRatio = String(opts.aspectRatio || 1).replace('/', ' / ');
      state.stage.classList.toggle('is-banner-crop', opts.shape === 'rect');
      state.stage.classList.toggle('is-photo-crop', opts.shape !== 'rect');
    }
  }

  function pointerDistance(){
    const pts = Array.from(state.pointers.values());
    if(pts.length < 2) return 0;
    const dx = pts[0].x - pts[1].x;
    const dy = pts[0].y - pts[1].y;
    return Math.sqrt(dx*dx + dy*dy);
  }

  function endDrag(ev){
    if(ev && state.pointers) state.pointers.delete(ev.pointerId);
    if(state.pointers && state.pointers.size === 1){
      const remaining = Array.from(state.pointers.values())[0];
      state.dragging = true;
      state.startX = remaining.x;
      state.startY = remaining.y;
      state.baseX = state.x;
      state.baseY = state.y;
    } else {
      state.dragging = false;
    }
    try{ state.stage.releasePointerCapture(ev.pointerId); }catch(e){}
  }

  function open(file, input, options){
    ensureModal();
    state.input = input;
    state.file = file;
    state.cropFile = null;
    state.options = Object.assign({
      title: 'Ajustar foto de cadastro',
      description: 'Centralize seu rosto no círculo. Use uma foto real, legível e parecida com seu documento.',
      help: 'Arraste a imagem para posicionar. No celular, use pinça para aproximar/afastar. O arquivo salvo será quadrado e comprimido para o cadastro.',
      saveText: 'Usar esta foto',
      aspectRatio: 1,
      outputWidth: 700,
      outputHeight: 700,
      mimeType: 'image/jpeg',
      quality: 0.86,
      filePrefix: 'foto-staff',
      shape: 'circle',
      updatePreview: true,
      setCurrentFile: true
    }, options || {});
    applyOptionsToModal();
    state.pointers && state.pointers.clear();

    return new Promise((resolve) => {
      state.resolve = resolve;
      if(state.objectUrl) URL.revokeObjectURL(state.objectUrl);
      state.objectUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        state.image = img;
        state.naturalW = img.naturalWidth;
        state.naturalH = img.naturalHeight;
        state.imgEl.src = state.objectUrl;

        // Abre o modal antes de calcular escala.
        // Quando o backdrop estava display:none, o stage não tinha tamanho real
        // e banners 16:9 eram iniciados com escala incorreta, cortando laterais/topo.
        state.backdrop.classList.add('is-open');
        requestAnimationFrame(() => {
          setupInitialScale();
        });
      };
      img.onerror = () => {
        cleanup(false);
      };
      img.src = state.objectUrl;
    });
  }

  function setupInitialScale(){
    const rect = cropRect();
    // Para banner retangular, a escala mínima precisa preencher o quadro sem cortes
    // quando a proporção da imagem já é igual à proporção do crop.
    const fitToCrop = Math.max(rect.cropW / state.naturalW, rect.cropH / state.naturalH);
    const safeFit = Math.max(fitToCrop, 0.0001);
    state.minScale = safeFit;
    state.scale = safeFit;
    state.zoomRange.min = String(safeFit);
    state.zoomRange.max = String(safeFit * 3);
    state.zoomRange.step = String(Math.max(0.001, safeFit / 100));
    state.zoomRange.value = String(safeFit);
    state.x = 0;
    state.y = 0;
    clampPosition();
    applyTransform();
  }

  function cropRect(){
    const stageW = state.stage.clientWidth || 420;
    const stageH = state.stage.clientHeight || Math.round(stageW / ((state.options && state.options.aspectRatio) || 1));
    const inset = state.options && state.options.shape === 'rect' ? 0 : 0.11;
    const cropW = stageW * (1 - inset * 2);
    const cropH = stageH * (1 - inset * 2);
    return { stageW, stageH, cropW, cropH, left:(stageW-cropW)/2, top:(stageH-cropH)/2 };
  }

  function clampPosition(){
    const { cropW, cropH } = cropRect();
    const drawnW = state.naturalW * state.scale;
    const drawnH = state.naturalH * state.scale;
    const maxX = Math.max(0, (drawnW - cropW) / 2);
    const maxY = Math.max(0, (drawnH - cropH) / 2);
    state.x = Math.min(maxX, Math.max(-maxX, state.x));
    state.y = Math.min(maxY, Math.max(-maxY, state.y));
  }

  function applyTransform(){
    state.imgEl.style.width = `${state.naturalW}px`;
    state.imgEl.style.height = `${state.naturalH}px`;
    state.imgEl.style.transform = `translate(calc(-50% + ${state.x}px), calc(-50% + ${state.y}px)) scale(${state.scale})`;
  }

  function save(){
    const opts = state.options || {};
    const outputW = Number(opts.outputWidth || 700);
    const outputH = Number(opts.outputHeight || outputW);
    const { stageW, stageH, cropW, cropH } = cropRect();
    const canvas = document.createElement('canvas');
    canvas.width = outputW;
    canvas.height = outputH;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0,0,outputW,outputH);

    const drawnW = state.naturalW * state.scale;
    const drawnH = state.naturalH * state.scale;
    const imgLeft = stageW/2 - drawnW/2 + state.x;
    const imgTop = stageH/2 - drawnH/2 + state.y;
    const cropLeft = (stageW - cropW) / 2;
    const cropTop = (stageH - cropH) / 2;

    const sx = Math.max(0, (cropLeft - imgLeft) / state.scale);
    const sy = Math.max(0, (cropTop - imgTop) / state.scale);
    const sw = Math.min(state.naturalW - sx, cropW / state.scale);
    const sh = Math.min(state.naturalH - sy, cropH / state.scale);

    ctx.drawImage(state.image, sx, sy, sw, sh, 0, 0, outputW, outputH);
    const mimeType = opts.mimeType || 'image/jpeg';
    const quality = typeof opts.quality === 'number' ? opts.quality : 0.86;
    canvas.toBlob((blob) => {
      if(!blob){ cleanup(false); return; }
      const ext = mimeType === 'image/webp' ? 'webp' : 'jpg';
      const baseName = state.file && state.file.name ? state.file.name.replace(/\.[^.]+$/, '') : (opts.filePrefix || 'imagem');
      const safeName = `${baseName}-recortada.${ext}`;
      state.cropFile = new File([blob], safeName, { type:mimeType, lastModified:Date.now() });
      if(opts.updatePreview !== false) updatePreview(state.cropFile);
      cleanup(true);
    }, mimeType, quality);
  }

  function updatePreview(file){
    const preview = $('fotoPreview');
    const previewImg = $('fotoPreviewImg');
    const previewText = $('fotoPreviewText');
    if(!preview || !previewImg || !previewText) return;
    const url = URL.createObjectURL(file);
    previewImg.src = url;
    previewText.textContent = `${file.name} • ${(file.size/1024/1024).toFixed(2)} MB`;
    preview.style.display = 'flex';
  }

  function cancel(){
    if(state.input) state.input.value = '';
    const preview = $('fotoPreview');
    if(preview && !window.StaffPhotoCropper.currentFile) preview.style.display = 'none';
    cleanup(false);
  }

  function cleanup(success){
    state.backdrop && state.backdrop.classList.remove('is-open');
    if(state.objectUrl){ URL.revokeObjectURL(state.objectUrl); state.objectUrl = ''; }
    if(success && state.cropFile && (!state.options || state.options.setCurrentFile !== false)){ window.StaffPhotoCropper.currentFile = state.cropFile; }
    if(!success && (!state.options || state.options.setCurrentFile !== false)){ window.StaffPhotoCropper.currentFile = null; }
    if(typeof state.resolve === 'function') state.resolve(success ? state.cropFile : null);
    state.resolve = null;
  }

  window.StaffPhotoCropper = {
    open,
    getFile(){ return this.currentFile || null; },
    clear(){ this.currentFile = null; }
  };
})();
