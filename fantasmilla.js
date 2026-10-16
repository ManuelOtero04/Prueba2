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
  
    // Las coordenadas están calculadas sobre un dibujo base y se escalan
    // para ocupar la misma caja que el fantasma anterior (unos 40 x 44).
    const k = 0.0244;
    const X = v => x + (v - 30) * k;
    const Y = v => yTop + (v - 70) * k;
    const mover = (a, b) => ctx.moveTo(X(a), Y(b));
    const curva = (a, b, c, d, e, f) =>
      ctx.bezierCurveTo(X(a), Y(b), X(c), Y(d), X(e), Y(f));
    const trazo = (a, b, c, d, e, f, g, h) => {
      ctx.beginPath();
      mover(a, b);
      curva(c, d, e, f, g, h);
      ctx.stroke();
    };
    const elipse = (cx, cy, rx, ry) => {
      ctx.moveTo(X(cx) + rx * k, Y(cy)); // evita líneas entre elipses
      ctx.ellipse(X(cx), Y(cy), rx * k, ry * k, 0, 0, Math.PI * 2);
    };
  
    const o = cola / k * 0.35; // ondulación del bajo y de la cola
    const contorno = '#8272a5';
    const tinta = '#382e4e';
  
    ctx.save();
    ctx.translate(0, flotacion);
    ctx.translate(x + 20, yTop + 22);
    ctx.scale(1.12, 1.12);
    ctx.translate(-(x + 20), -(yTop + 22));
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  
    // Sombra en el suelo
    ctx.fillStyle = 'rgba(74,61,103,.12)';
    ctx.beginPath();
    ctx.ellipse(x + 21, SUELO + 2, 18, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  
    // Silueta: cabeza redonda, bracitos en alto y bajo ondulado con cola
    const degradado = ctx.createLinearGradient(0, Y(75), 0, Y(1900));
    degradado.addColorStop(0, '#ffffff');
    degradado.addColorStop(1, '#efe9ff');
    ctx.fillStyle = degradado;
    ctx.strokeStyle = contorno;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    mover(820, 75);
    curva(1100, 75, 1335, 340, 1340, 690);            // cabeza (derecha)
    curva(1420, 625, 1560, 600, 1612, 660);           // brazo derecho, arriba
    curva(1675, 735, 1620, 930, 1490, 1070);          // brazo derecho, fuera
    curva(1440, 1120, 1405, 1145, 1380, 1160);
    curva(1420, 1290, 1520, 1390, 1620, 1460);        // costado derecho
    curva(1690, 1510, 1680, 1580, 1630, 1625);        // punta de la cola
    curva(1560, 1690 + o, 1450, 1650 - o, 1380, 1700);
    curva(1310, 1750 + o, 1280, 1820 - o, 1190, 1850);
    curva(1100, 1880 + o, 1000, 1880 + o, 940, 1820);
    curva(880, 1870 - o, 720, 1890 + o, 580, 1860);
    curva(440, 1840 - o, 230, 1870 + o, 150, 1800);
    curva(120, 1770, 150, 1720, 180, 1670);           // esquina izquierda
    curva(260, 1530, 345, 1350, 340, 1160);           // costado izquierdo
    curva(180, 1100, 25, 960, 30, 770);               // brazo izquierdo, fuera
    curva(30, 660, 130, 610, 210, 640);
    curva(260, 660, 290, 690, 300, 700);
    curva(270, 380, 470, 75, 820, 75);                // cabeza (izquierda)
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  
    // Pliegues de la sábana y arranque de los brazos
    ctx.lineWidth = 1.2;
    trazo(300, 690, 340, 720, 380, 770, 390, 805);
    trazo(1370, 700, 1330, 730, 1310, 790, 1305, 830);
    trazo(347, 1040, 372, 1110, 372, 1170, 346, 1230);
    trazo(1332, 1060, 1345, 1100, 1362, 1135, 1385, 1165);
    trazo(528, 1590, 515, 1680, 490, 1760, 462, 1815);
    trazo(912, 1545, 925, 1620, 940, 1680, 955, 1725);
    trazo(1148, 1345, 1190, 1420, 1270, 1480, 1350, 1505);
  
    // Mejillas: rubor suave y dos rayitas
    ctx.fillStyle = 'rgba(255,150,175,.35)';
    ctx.beginPath();
    elipse(610, 765, 95, 55);
    elipse(1145, 755, 95, 55);
    ctx.fill();
    ctx.strokeStyle = '#ef8fb0';
    ctx.lineWidth = 0.8;
    trazo(540, 790, 555, 772, 572, 752, 592, 738);
    trazo(630, 795, 645, 777, 662, 757, 682, 743);
    trazo(1085, 785, 1100, 767, 1117, 747, 1137, 733);
    trazo(1175, 790, 1190, 772, 1207, 752, 1227, 738);
  
    // Ojazos con brillos
    ctx.fillStyle = tinta;
    ctx.beginPath();
    elipse(602, 565, 110, 120);
    elipse(1110, 558, 108, 120);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    elipse(600, 505, 40, 40);
    elipse(654, 542, 22, 22);
    elipse(535, 602, 15, 15);
    elipse(1118, 498, 40, 40);
    elipse(1168, 535, 22, 22);
    elipse(1045, 595, 15, 15);
    ctx.fill();
    [[555, 628, 668, 628], [1060, 628, 1175, 628]].forEach(([a, b, c, d]) => {
      ctx.beginPath();
      mover(a, b);
      ctx.quadraticCurveTo(X((a + c) / 2), Y(b + 62), X(c), Y(d));
      ctx.quadraticCurveTo(X((a + c) / 2), Y(b + 22), X(a), Y(b));
      ctx.fill();
    });
  
    // Boquita en forma de corazón, abierta
    ctx.fillStyle = tinta;
    ctx.beginPath();
    mover(865, 688);
    curva(850, 650, 800, 640, 775, 680);
    curva(755, 715, 770, 770, 820, 810);
    curva(845, 835, 880, 850, 905, 825);
    curva(950, 790, 980, 730, 960, 685);
    curva(940, 640, 885, 650, 865, 688);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    mover(838, 765);
    curva(870, 750, 910, 765, 920, 780);
    curva(915, 812, 885, 835, 868, 828);
    curva(845, 815, 832, 790, 838, 765);
    ctx.closePath();
    ctx.fill();
  
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

    const etiqueta = o.variante === 0 ? 'URGENTE' : o.variante === 1 ? 'FIRMA' : 'INFORME';
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
    {
      const cx = 544;   // centro de la cajonera
      const base = 110; // borde superior de la cajonera
      const amarillo = '#e0a93a';
      const contorno = '#5b4a2e';
      const metal = '#5d6366';
      const metalOscuro = '#3a3f42';
      const archivadorX = 510;
      const archivadorY = base;
      const archivadorAncho = 68;
      const archivadorAlto = 51;
      const caja = (x, y, w, h, r) => {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
      };

      // Dibujar primero el archivador para que el robot quede apoyado encima.
      ctx.fillStyle = 'rgba(65,52,39,.16)';
      ctx.beginPath();
      ctx.ellipse(cx, archivadorY + archivadorAlto + 2, 39, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#8d806c';
      ctx.strokeStyle = '#635844';
      ctx.lineWidth = 1.5;
      caja(archivadorX, archivadorY, archivadorAncho, archivadorAlto, 5);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#d9c9ad';
      for (let i = 0; i < 2; i++) {
        const cajonY = archivadorY + 5 + i * 21;
        caja(archivadorX + 6, cajonY, archivadorAncho - 12, 17, 2);
        ctx.fill();
        ctx.strokeStyle = '#a28e70';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = '#88795f';
        caja(cx - 6, cajonY + 7, 12, 3, 1.5);
        ctx.fill();
        ctx.fillStyle = '#d9c9ad';
      }
 
      ctx.save();
      ctx.translate(cx, base);
      ctx.scale(0.9, 0.9);
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
 
      // Sombra sobre la cajonera
      ctx.fillStyle = 'rgba(40,30,20,.18)';
      ctx.beginPath();
      ctx.ellipse(0, 0.5, 22, 2.2, 0, 0, Math.PI * 2);
      ctx.fill();
 
      // Orugas
      [-19, 9].forEach((x) => {
        ctx.fillStyle = '#4b5154';
        ctx.strokeStyle = '#2b2f31';
        ctx.lineWidth = 1.2;
        caja(x, -11, 10, 11, 3);
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = '#7b8286';
        ctx.lineWidth = 1;
        [-8, -5.5, -3].forEach((y) => {
          ctx.beginPath();
          ctx.moveTo(x + 2, y);
          ctx.lineTo(x + 8, y);
          ctx.stroke();
        });
      });
 
      // Brazos en alto, saludando
      [-1, 1].forEach((lado) => {
        ctx.strokeStyle = metal;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(lado * 13, -18);
        ctx.lineTo(lado * 20, -19);
        ctx.lineTo(lado * 22, -26);
        ctx.stroke();
        ctx.fillStyle = '#8a9093';
        ctx.strokeStyle = metalOscuro;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(lado * 22, -27.5, 2.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });
 
      // Cuerpo
      ctx.fillStyle = amarillo;
      ctx.strokeStyle = contorno;
      ctx.lineWidth = 1.3;
      caja(-14, -25, 28, 19, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,240,190,.35)';
      ctx.fillRect(-12.5, -23.7, 25, 2);
      ctx.fillStyle = 'rgba(150,85,30,.45)';
      [[-11, -9, 1.6], [10, -12, 1.2], [-9.5, -23, 1], [11, -22, 1.4]].forEach(([x, y, r]) => {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      });
 
      // Panel solar del pecho
      ctx.fillStyle = '#46586a';
      ctx.strokeStyle = '#2f3b47';
      ctx.lineWidth = 1;
      caja(-8, -21, 16, 10, 1.5);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = '#8fa3b5';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(-2.7, -21); ctx.lineTo(-2.7, -11);
      ctx.moveTo(2.7, -21); ctx.lineTo(2.7, -11);
      ctx.moveTo(-8, -16); ctx.lineTo(8, -16);
      ctx.stroke();
 
      // Cuello y soporte de la cabeza
      ctx.fillStyle = '#6b7073';
      ctx.strokeStyle = metalOscuro;
      ctx.lineWidth = 1;
      caja(-2, -31, 4, 6.5, 1);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-2, -29); ctx.lineTo(2, -29);
      ctx.moveTo(-2, -27); ctx.lineTo(2, -27);
      ctx.stroke();
      ctx.fillStyle = metal;
      caja(-5.5, -33.5, 11, 3.5, 1.2);
      ctx.fill();
      ctx.stroke();
 
      // Ojos binoculares, algo inclinados
      [-1, 1].forEach((lado) => {
        ctx.save();
        ctx.translate(lado * 7.2, -38.5);
        ctx.rotate(lado * 0.2);
        ctx.fillStyle = amarillo;
        ctx.strokeStyle = contorno;
        ctx.lineWidth = 1.3;
        caja(-6, -5.5, 12, 11, 4);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = metalOscuro;
        ctx.beginPath();
        ctx.arc(0, 0.3, 4.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#14202c';
        ctx.beginPath();
        ctx.arc(0, 0.3, 3.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(-1.1, -1, 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(111,180,255,.9)';
        ctx.beginPath();
        ctx.arc(1.1, 1.6, 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
      ctx.restore();
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
      dibujarTextoCentrado('Toca la pantalla o pulsa ESPACIO para empezar', 125, 18);
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
