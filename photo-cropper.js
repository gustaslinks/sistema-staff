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
    pinchBaseY: 0
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

  function open(file, input){
    ensureModal();
    state.input = input;
    state.file = file;
    state.cropFile = null;
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
        setupInitialScale();
        state.backdrop.classList.add('is-open');
      };
      img.onerror = () => {
        cleanup(false);
      };
      img.src = state.objectUrl;
    });
  }

  function setupInitialScale(){
    const stageSize = state.stage.clientWidth || 420;
    const cropSize = stageSize * 0.78;
    const fitToCrop = Math.max(cropSize / state.naturalW, cropSize / state.naturalH);
    state.minScale = fitToCrop;
    state.scale = fitToCrop;
    state.zoomRange.min = String(fitToCrop);
    state.zoomRange.max = String(fitToCrop * 3);
    state.zoomRange.step = String(Math.max(0.005, fitToCrop / 100));
    state.zoomRange.value = String(fitToCrop);
    state.x = 0;
    state.y = 0;
    applyTransform();
  }

  function cropRect(){
    const stageSize = state.stage.clientWidth || 420;
    const cropSize = stageSize * 0.78;
    return { stageSize, cropSize, left:(stageSize-cropSize)/2, top:(stageSize-cropSize)/2 };
  }

  function clampPosition(){
    const { cropSize } = cropRect();
    const drawnW = state.naturalW * state.scale;
    const drawnH = state.naturalH * state.scale;
    const maxX = Math.max(0, (drawnW - cropSize) / 2);
    const maxY = Math.max(0, (drawnH - cropSize) / 2);
    state.x = Math.min(maxX, Math.max(-maxX, state.x));
    state.y = Math.min(maxY, Math.max(-maxY, state.y));
  }

  function applyTransform(){
    state.imgEl.style.width = `${state.naturalW}px`;
    state.imgEl.style.height = `${state.naturalH}px`;
    state.imgEl.style.transform = `translate(calc(-50% + ${state.x}px), calc(-50% + ${state.y}px)) scale(${state.scale})`;
  }

  function save(){
    const outputSize = 700;
    const { stageSize, cropSize } = cropRect();
    const canvas = document.createElement('canvas');
    canvas.width = outputSize;
    canvas.height = outputSize;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0,0,outputSize,outputSize);

    const drawnW = state.naturalW * state.scale;
    const drawnH = state.naturalH * state.scale;
    const imgLeft = stageSize/2 - drawnW/2 + state.x;
    const imgTop = stageSize/2 - drawnH/2 + state.y;
    const cropLeft = (stageSize - cropSize) / 2;
    const cropTop = (stageSize - cropSize) / 2;

    const sx = Math.max(0, (cropLeft - imgLeft) / state.scale);
    const sy = Math.max(0, (cropTop - imgTop) / state.scale);
    const sw = Math.min(state.naturalW - sx, cropSize / state.scale);
    const sh = Math.min(state.naturalH - sy, cropSize / state.scale);

    ctx.drawImage(state.image, sx, sy, sw, sh, 0, 0, outputSize, outputSize);
    canvas.toBlob((blob) => {
      if(!blob){ cleanup(false); return; }
      const safeName = (state.file && state.file.name ? state.file.name.replace(/\.[^.]+$/, '') : 'foto-staff');
      state.cropFile = new File([blob], `${safeName}-recortada.jpg`, { type:'image/jpeg', lastModified:Date.now() });
      updatePreview(state.cropFile);
      cleanup(true);
    }, 'image/jpeg', 0.86);
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
    if(success && state.cropFile){ window.StaffPhotoCropper.currentFile = state.cropFile; }
    if(!success){ window.StaffPhotoCropper.currentFile = null; }
    if(typeof state.resolve === 'function') state.resolve(success ? state.cropFile : null);
    state.resolve = null;
  }

  window.StaffPhotoCropper = {
    open,
    getFile(){ return this.currentFile || null; },
    clear(){ this.currentFile = null; }
  };
})();
