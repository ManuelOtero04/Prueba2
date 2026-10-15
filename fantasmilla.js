/**
 * Minijuego de Fantasmilla esquivando papeleo en una oficina.
 *
 * Uso:
 *   iniciarFantasmilla(document.getElementById('pantalla'), () => {
 *     // se ejecuta al completar el minijuego
 *     mostrarPantalla(4);
 *   });
 *
 * Opciones (tercer parámetro, todas opcionales):
 *   meta:      puntos necesarios para terminar (por defecto 300)
 *   velocidad: velocidad inicial (por defecto 4)
 * Controles: Espacio / Flecha arriba / clic / toque en pantalla.
 */
function iniciarFantasmilla(contenedor, alTerminar, opciones = {}) {
  const META = opciones.meta ?? 1200;
  const VEL_INICIAL = opciones.velocidad ?? 3;

  // ---------- Configuración ----------
  const W = 600;
  const H = 240;
  const SUELO = 190;          // coordenada Y del suelo
  const GRAVEDAD = 0.65;
  const FUERZA_SALTO = -13;

  const COLOR = '#4a3d67';
  const COLOR_FONDO = '#f3eee5';
  const COLOR_ACENTO = '#b8a4e8';

  // ---------- DOM ----------
  contenedor.innerHTML = '';
  const caja = document.createElement('div');
  caja.style.cssText = 'max-width:800px;margin:0 auto;text-align:center;font-family:"DM Sans",sans-serif;';

  const titulo = document.createElement('p');
  titulo.textContent = '¡Ayuda a FantasmILLA a esquivar el papeleo!';
  titulo.style.cssText = 'margin:0 0 12px;color:' + COLOR + ';font-size:1.1rem;font-weight:700;';

  const canvas = document.createElement('canvas');
  canvas.style.cssText =
    'display:block;width:100%;max-width:800px;height:auto;aspect-ratio:' + W + '/' + H +
    ';background:' + COLOR_FONDO +
    ';border:1px solid rgba(74,61,103,.16);border-radius:16px;box-shadow:0 12px 32px rgba(74,61,103,.12);' +
    'touch-action:manipulation;cursor:pointer;';
  const ctx = canvas.getContext('2d');
  let escalaVisualCanvas = 1;

  function ajustarResolucion() {
    escalaVisualCanvas = canvas.getBoundingClientRect().width / W || 1;
    const pixelRatio = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * escalaVisualCanvas * pixelRatio);
    canvas.height = Math.round(H * escalaVisualCanvas * pixelRatio);
    ctx.setTransform(escalaVisualCanvas * pixelRatio, 0, 0, escalaVisualCanvas * pixelRatio, 0, 0);
  }

  function agregarRectRedondeado(x, y, w, h, radio) {
    const r = Math.min(radio, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  caja.appendChild(titulo);
  caja.appendChild(canvas);

  contenedor.appendChild(caja);

  // ---------- Estado ----------
  let estado = 'espera';      // 'espera' | 'jugando' | 'muerto' | 'ganado'
  let rafId = null;
  let ultimoTiempo = 0;
  let activo = true;

  let fantasma, obstaculos, velocidad, distancia, proximoObstaculo, fotograma;

  function reiniciar() {
    fantasma = { x: 50, y: SUELO, w: 40, h: 44, vy: 0, enSuelo: true };
    obstaculos = [];
    velocidad = VEL_INICIAL;
    distancia = 0;
    proximoObstaculo = 400;
    fotograma = 0;
  }

  // ---------- Entrada ----------
  function saltar() {
    if (!activo) return;
    if (estado === 'espera' || estado === 'muerto') {
      reiniciar();
      estado = 'jugando';
      ultimoTiempo = performance.now();
      return;
    }
    if (estado === 'jugando' && fantasma.enSuelo) {
      fantasma.vy = FUERZA_SALTO;
      fantasma.enSuelo = false;
    }
  }

  function alPulsarTecla(e) {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
      e.preventDefault();
      saltar();
    }
  }

  function alPulsarCanvas(e) {
    e.preventDefault();
    saltar();
  }

  document.addEventListener('keydown', alPulsarTecla);
  canvas.addEventListener('pointerdown', alPulsarCanvas);
  window.addEventListener('resize', ajustarResolucion);

  // ---------- Lógica ----------
  function crearObstaculo() {
    const grande = Math.random() > 0.6;
    const ancho = grande ? 38 : 32;
    const alto = grande ? 46 : 36;
    obstaculos.push({ x: W + 10, w: ancho, h: alto, variante: Math.floor(Math.random() * 3) });
    // distancia hasta el siguiente: se acorta un poco con la velocidad
    proximoObstaculo = 280 + Math.random() * 260 + velocidad * 8;
  }

  function actualizar(dt) {
    fotograma += dt;
    distancia += velocidad * dt;
    velocidad = VEL_INICIAL + distancia / 3000; //1800 

    // Fantasmilla sube y cae con la misma mecanica de salto que el dinosaurio.
    fantasma.vy += GRAVEDAD * dt;
    fantasma.y += fantasma.vy * dt;
    if (fantasma.y >= SUELO) {
      fantasma.y = SUELO;
      fantasma.vy = 0;
      fantasma.enSuelo = true;
    }

    // obstáculos
    proximoObstaculo -= velocidad * dt;
    if (proximoObstaculo <= 0) crearObstaculo();
    obstaculos.forEach(o => (o.x -= velocidad * dt));
    obstaculos = obstaculos.filter(o => o.x + o.w > -10);

    // colisión (hitbox algo más pequeña para ser permisivo)
    const margen = 6;
    const caja = {
      x: fantasma.x + margen,
      y: fantasma.y - fantasma.h + margen,
      w: fantasma.w - margen * 2,
      h: fantasma.h - margen * 2
    };
    for (const o of obstaculos) {
      const oc = { x: o.x + 2, y: SUELO - o.h + 2, w: o.w - 4, h: o.h - 2 };
      if (
        caja.x < oc.x + oc.w &&
        caja.x + caja.w > oc.x &&
        caja.y < oc.y + oc.h &&
        caja.y + caja.h > oc.y
      ) {
        estado = 'muerto';
        return;
      }
    }

    // victoria
    if (Math.floor(distancia / 10) >= META) {
      estado = 'ganado';
      setTimeout(terminar, 8000);
    }
  }

  // ---------- Dibujo ----------
  function dibujarFantasmilla() {
    const x = fantasma.x;
    const yTop = fantasma.y - fantasma.h;
    const flotacion = estado === 'jugando' && fantasma.enSuelo
      ? Math.sin(fotograma / 4) * 1.2
      : 0;
    const cola = Math.sin(fotograma / 3) * 1.5;

    ctx.save();
    ctx.translate(0, flotacion);
    ctx.translate(x + 20, yTop + 22);
    ctx.scale(1.12, 1.12);
    ctx.translate(-(x + 20), -(yTop + 22));
    ctx.fillStyle = 'rgba(74,61,103,.12)';
    ctx.beginPath();
    ctx.ellipse(x + 21, SUELO + 2, 18, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,.96)';
    ctx.strokeStyle = '#8272a5';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + 5, yTop + 40);
    ctx.lineTo(x + 5, yTop + 18);
    ctx.quadraticCurveTo(x + 5, yTop + 3, x + 20, yTop + 3);
    ctx.quadraticCurveTo(x + 35, yTop + 3, x + 35, yTop + 18);
    ctx.lineTo(x + 35, yTop + 40);
    ctx.quadraticCurveTo(x + 31, yTop + 36 + cola, x + 27, yTop + 40);
    ctx.quadraticCurveTo(x + 23, yTop + 44 - cola, x + 19, yTop + 40);
    ctx.quadraticCurveTo(x + 12, yTop + 44 + cola, x + 5, yTop + 40);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Manos diminutas que asoman a los lados de la sabana.
    ctx.strokeStyle = '#8272a5';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x + 6, yTop + 25);
    ctx.lineTo(x + 1, yTop + 28);
    ctx.moveTo(x + 34, yTop + 25);
    ctx.lineTo(x + 39, yTop + 28);
    ctx.stroke();

    // Ojos grandes con brillo, sonrisa y mejillas sonrosadas.
    ctx.fillStyle = '#382e4e';
    ctx.beginPath();
    ctx.ellipse(x + 14, yTop + 19, 2.6, 3.5, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 27, yTop + 19, 2.6, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x + 14.8, yTop + 17.8, 0.9, 0, Math.PI * 2);
    ctx.arc(x + 27.8, yTop + 17.8, 0.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#806da5';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(x + 20.5, yTop + 23, 3.5, 0.15, Math.PI - 0.15);
    ctx.stroke();
    ctx.fillStyle = 'rgba(235,145,170,.72)';
    ctx.beginPath();
    ctx.ellipse(x + 9, yTop + 24, 3, 1.6, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 32, yTop + 24, 3, 1.6, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#b8a4e8';
    ctx.beginPath();
    agregarRectRedondeado(x + 12, yTop + 30, 18, 9, 2);
    ctx.fill();
    ctx.fillStyle = '#382e4e';
    ctx.font = 'bold 6px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CCHS', x + 21, yTop + 36.5);
    ctx.restore();
  }

  function dibujarDocumento(o) {
    const y = SUELO - o.h;
    const papel = '#fffdf8';
    const borde = '#b6ad9c';
    const anchoInterior = o.w - 8;
    const xInterior = o.x + 4;

    // Capas de folios para que el obstaculo se lea como un expediente.
    ctx.fillStyle = '#c4b59a';
    ctx.beginPath();
    agregarRectRedondeado(o.x + 2, y + 5, o.w, o.h - 3, 3);
    ctx.fill();
    ctx.fillStyle = '#e5d7bd';
    ctx.beginPath();
    agregarRectRedondeado(o.x, y + 2, o.w, o.h - 2, 3);
    ctx.fill();
    ctx.fillStyle = papel;
    ctx.strokeStyle = borde;
    ctx.lineWidth = 1;
    ctx.beginPath();
    agregarRectRedondeado(xInterior, y, anchoInterior, o.h, 3);
    ctx.fill();
    ctx.stroke();

    // Esquina doblada y lineas de formulario.
    ctx.fillStyle = '#e8e0d2';
    ctx.beginPath();
    ctx.moveTo(xInterior + anchoInterior - 7, y + 1);
    ctx.lineTo(xInterior + anchoInterior - 1, y + 7);
    ctx.lineTo(xInterior + anchoInterior - 7, y + 7);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#c4bdaf';
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      const lineaY = y + 14 + i * 6;
      if (lineaY < SUELO - 7) {
        ctx.beginPath();
        ctx.moveTo(xInterior + 4, lineaY);
        ctx.lineTo(xInterior + anchoInterior - 4 - (i % 2) * 4, lineaY);
        ctx.stroke();
      }
    }

    const etiqueta = o.variante === 0 ? 'URGENTE' : o.variante === 1 ? 'FIRMA' : 'COPIA';
    const tamFuente = 10 / escalaVisualCanvas;
    ctx.font = '700 ' + tamFuente + 'px "DM Sans", sans-serif';
    const anchoEtiqueta = ctx.measureText(etiqueta).width + 14 / escalaVisualCanvas;
    const altoEtiqueta = 20 / escalaVisualCanvas;
    const etiquetaX = o.x + (o.w - anchoEtiqueta) / 2;
    const etiquetaY = y - altoEtiqueta - 4 / escalaVisualCanvas;

    // Cartela legible, adaptada al tamano en pantalla y unida al documento.
    ctx.strokeStyle = '#b34e57';
    ctx.lineWidth = 1.5 / escalaVisualCanvas;
    ctx.beginPath();
    ctx.moveTo(o.x + o.w / 2, etiquetaY + altoEtiqueta);
    ctx.lineTo(o.x + o.w / 2, y + 1);
    ctx.stroke();
    ctx.fillStyle = '#fff4f1';
    ctx.beginPath();
    agregarRectRedondeado(etiquetaX, etiquetaY, anchoEtiqueta, altoEtiqueta, 4 / escalaVisualCanvas);
    ctx.fill();
    ctx.strokeStyle = '#c75b62';
    ctx.stroke();
    ctx.fillStyle = '#963c46';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(etiqueta, o.x + o.w / 2, etiquetaY + altoEtiqueta / 2);
    ctx.textBaseline = 'alphabetic';
  }

  function dibujarTextoCentrado(texto, y, tam) {
    ctx.font = '700 ' + tam + 'px "DM Sans", sans-serif';
    ctx.textAlign = 'center';
    const ancho = Math.min(W - 36, ctx.measureText(texto).width + 44);
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    ctx.beginPath();
    agregarRectRedondeado((W - ancho) / 2, y - tam - 14, ancho, tam + 30, 14);
    ctx.fill();
    ctx.fillStyle = COLOR;
    ctx.fillText(texto, W / 2, y);
  }

  function dibujar() {
    ctx.clearRect(0, 0, W, H);
    const pared = ctx.createLinearGradient(0, 0, 0, SUELO);
    pared.addColorStop(0, '#f4eee2');
    pared.addColorStop(1, '#e8dfd0');
    ctx.fillStyle = pared;
    ctx.fillRect(0, 0, W, H);

    // Ventana y persianas.
    ctx.fillStyle = '#aa9679';
    agregarRectRedondeado(28, 31, 132, 76, 5);
    ctx.fill();
    ctx.fillStyle = '#c8e4e7';
    ctx.fillRect(33, 36, 122, 66);
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.fillRect(37, 40, 53, 58);
    ctx.fillStyle = '#9db9b8';
    ctx.fillRect(92, 40, 3, 58);
    ctx.fillRect(35, 67, 118, 3);
    ctx.fillStyle = 'rgba(255,255,255,.62)';
    for (let y = 43; y < 62; y += 6) ctx.fillRect(34, y, 120, 2);

    // Tablon con avisos y un calendario de oficina.
    ctx.fillStyle = '#b99b75';
    agregarRectRedondeado(190, 29, 194, 78, 5);
    ctx.fill();
    ctx.fillStyle = '#d8c2a0';
    ctx.fillRect(196, 35, 182, 66);
    ctx.fillStyle = '#fffdf7';
    ctx.fillRect(205, 42, 42, 49);
    ctx.fillStyle = '#9c6d67';
    ctx.fillRect(205, 42, 42, 9);
    ctx.fillStyle = '#fffdf7';
    ctx.font = 'bold 6px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CALENDARIO', 226, 49);
    ctx.strokeStyle = '#c7bba9';
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(211, 61 + i * 8);
      ctx.lineTo(241, 61 + i * 8);
      ctx.stroke();
    }
    ctx.fillStyle = '#b8d4b5';
    ctx.fillRect(257, 43, 48, 31);
    ctx.fillStyle = '#ebe8b4';
    ctx.fillRect(314, 50, 50, 39);
    ctx.fillStyle = '#4a3d67';
    ctx.font = 'bold 6px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('REUNIÓN', 281, 54, 44);
    ctx.font = 'bold 5px sans-serif';
    ctx.fillText('LABORATORIO', 339, 62, 46);
    ctx.fillText('DE FONÉTICA', 339, 70, 46);
    ctx.fillStyle = '#c75b62';
    ctx.beginPath();
    ctx.arc(266, 39, 2, 0, Math.PI * 2);
    ctx.arc(337, 45, 2, 0, Math.PI * 2);
    ctx.fill();

    // Reloj y archivador al fondo.
    ctx.fillStyle = '#fffdf8';
    ctx.strokeStyle = '#8d806c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(448, 62, 23, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#4a3d67';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(448, 62);
    ctx.lineTo(448, 48);
    ctx.moveTo(448, 62);
    ctx.lineTo(458, 67);
    ctx.stroke();
    ctx.fillStyle = '#8d806c';
    agregarRectRedondeado(513, 110, 62, 51, 4);
    ctx.fill();
    ctx.fillStyle = '#d9c9ad';
    for (let y = 117; y < 157; y += 19) {
      agregarRectRedondeado(519, y, 50, 15, 2);
      ctx.fill();
      ctx.fillStyle = '#88795f';
      ctx.fillRect(539, y + 5, 10, 2);
      ctx.fillStyle = '#d9c9ad';
    }

    // Zocalo y suelo de oficina con juntas que se desplazan al correr.
    ctx.fillStyle = '#b9a88d';
    ctx.fillRect(0, 160, W, 7);
    ctx.fillStyle = '#d2c3a9';
    ctx.fillRect(0, 167, W, H - 167);
    ctx.fillStyle = 'rgba(112,94,69,.16)';
    ctx.fillRect(0, SUELO, W, 2);
    ctx.strokeStyle = 'rgba(112,94,69,.18)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
      const gx = ((i * 94 - distancia * 1.2) % W + W) % W;
      ctx.beginPath();
      ctx.moveTo(gx, 168);
      ctx.lineTo(gx, H);
      ctx.stroke();
    }
    for (let y = 188; y < H; y += 24) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    obstaculos.forEach(dibujarDocumento);
    dibujarFantasmilla();

    // Marcador y progreso.
    const puntos = Math.floor(distancia / 10);
    ctx.font = '700 14px "DM Sans", sans-serif';
    ctx.textAlign = 'right';
    const progreso = Math.min(1, puntos / META);
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    ctx.beginPath();
    agregarRectRedondeado(W - 140, 12, 126, 32, 12);
    ctx.fill();
    ctx.fillStyle = COLOR;
    ctx.fillText(String(puntos).padStart(4, '0') + ' / ' + META, W - 24, 33);
    ctx.fillStyle = 'rgba(74,61,103,.14)';
    ctx.beginPath();
    agregarRectRedondeado(16, 20, 78, 6, 3);
    ctx.fill();
    ctx.fillStyle = COLOR_ACENTO;
    ctx.beginPath();
    agregarRectRedondeado(16, 20, 78 * progreso, 6, 3);
    ctx.fill();

    if (estado === 'espera') {
      dibujarTextoCentrado('Toca o pulsa ESPACIO para empezar', 125, 18);
    } else if (estado === 'muerto') {
      dibujarTextoCentrado('¡Mucho papeleo! Toca para reintentar', 125, 18);
    } else if (estado === 'ganado') {
      dibujarTextoCentrado('¡FantasmILLA sobrevivió a la avalancha burocrática!', 125, 18);
    }
  }

  // ---------- Bucle principal ----------
  function bucle(ahora) {
    if (!activo) return;
    if (estado === 'jugando') {
      // dt normalizado a 60 fps; límite para evitar saltos si la pestaña estaba en segundo plano
      const dt = Math.min((ahora - ultimoTiempo) / 16.667, 3);
      ultimoTiempo = ahora;
      actualizar(dt);
    }
    dibujar();
    rafId = requestAnimationFrame(bucle);
  }

  // ---------- Fin y limpieza ----------
  function terminar() {
    if (!activo) return;
    activo = false;
    cancelAnimationFrame(rafId);
    document.removeEventListener('keydown', alPulsarTecla);
    canvas.removeEventListener('pointerdown', alPulsarCanvas);
    window.removeEventListener('resize', ajustarResolucion);
    contenedor.innerHTML = '';
    if (typeof alTerminar === 'function') alTerminar();
  }

  ajustarResolucion();
  reiniciar();
  rafId = requestAnimationFrame(bucle);

  // Devuelve una función por si quieres cancelar el juego desde fuera
  return terminar;
}
