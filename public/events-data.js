/* ============================================================
   ALFILO · REGISTRO CENTRAL DE EVENTOS
   ----------------------------------------------------------------
   Añade aquí cada nuevo evento. El sistema se encarga de:
   · Mostrar como popup si está dentro de fechas (startDate → endDate)
   · Mostrarlo en la sección de Eventos de la web siempre
   · Si hay varios activos a la vez: el de menor priority (1)
     abre como popup principal; los demás aparecen como botones
     flotantes en la esquina (priority 2 abajo, 3 encima).
   ============================================================ */

window.ALFILO_EVENTS = [

  {
    id: 'streetbar-ourense-2026',
    priority: 1,                       // 1 = más prioritario, 3 = menos
    startDate: '2026-05-03',
    endDate:   '2026-06-07',
    appearDelayMs: 1500,

    // --- Contenido ---
    title1:               'STREET BAR CITIZEN',
    title2:               'OURENSE',
    subtitle:             'Bar Citizen World Tour 2026 · Ourense',
    date:                 '6 JUN 2026',
    location:             'Ourense',
    type:                 'Tour de bares y pinchos',
    description:          'Únete al recorrido oficial por las plazas y tabernas de Ourense. Una jornada para reunir a la comunidad de Star Citizen, brindar entre ciudadanos y celebrar el universo que nos une.',
    descriptionHighlight: '¡Tour de bares y pinchos por todo lo alto!',
    reopenLabel:          'Bar Citizen Ourense',

    // --- Enlaces ---
    infoUrl:       'https://sbarou.taplink.site/',
    monstertechUrl:'https://www.monster.tech/en/?ref=qxhxhdwg',
    sclabsUrl:     'https://sclabs.space/',

    // --- Imágenes ---
    posterImg:          'assets/events/streetbar/cartel.jpg',
    eventLogoImg:       'assets/events/streetbar/logo-clean.png',
    qrImg:              'assets/events/streetbar/qr-taplink.png',
    alfiloImg:          'assets/events/streetbar/logo-alfilo.png',
    monstertechImg:     'assets/events/streetbar/sponsor-mva.png',
    madeByCommunityImg: 'assets/events/streetbar/made-by-community.png',
    sclabsImg:          'assets/events/streetbar/SCLABS.png',
  },

  // ── PLANTILLA: evento interno in-game ────────────────────────
  // layout 'ingame' → vídeo hero, título, descripción y CTA. Sin patrocinadores ni QR.
  {
    id:       'tsg-alfilo-2026',
    layout:   'ingame',
    priority: 2,                       // 1 = más prioritario, 3 = menos
    startDate: '2026-05-01',           // PROVISIONAL
    endDate:   '2026-08-31',           // PROVISIONAL
    appearDelayMs: 1500,

    // --- Contenido ---
    title1:               'TACTICAL STRIKE',
    title2:               'GROUP',
    subtitle:             'Star Citizen 4.8 · Operaciones tácticas',
    date:                 'Star Citizen 4.8',
    type:                 'Operación in-game',
    description:          'Con el nuevo parche 4.8 en ALFILO efectuaremos varios TSG. Únete a nosotros en nuestras aventuras.',
    descriptionHighlight: '¡¡ Te esperamos !!',
    reopenLabel:          'Tactical Strike Group',

    // --- CTA ---
    ctaUrl:   'https://discord.com/invite/Bmx5Dw4mEf',
    ctaLabel: 'Únete en Discord',

    // --- Vídeo / Imágenes ---
    posterVideo:  'assets/events/tsg/tsg3.mp4',
    posterImg:    'assets/events/tsg/cartel.jpg',     // fallback / mini-tarjeta
    eventLogoImg: 'assets/events/tsg/alfilo-transparent.png',  // solo para mini-tarjeta del archivo
  },

  {
    id:       'xenothreat-alfilo-2026',
    layout:   'ingame',
    priority: 2,                       // 1 = más prioritario, 3 = menos
    startDate: '2026-05-01',           // PROVISIONAL
    endDate:   '2026-08-31',           // PROVISIONAL
    appearDelayMs: 1500,

    // --- Contenido ---
    title1:               'STAR CITIZEN 4.8',
    title2:               'XENOTHREAT',
    subtitle:             'Star Citizen 4.8 · Operación de combate',
    date:                 'Star Citizen 4.8',
    type:                 'Operación in-game',
    description:          'Con el nuevo parche, en ALFILO nos vamos a coordinar para acabar con esos malditos bastardos de la Xenothreat. Únete a nuestras aventuras.',
    descriptionHighlight: '¡¡ Te esperamos !!',
    reopenLabel:          'Xenothreat',

    // --- CTA ---
    ctaUrl:   'https://discord.com/invite/Bmx5Dw4mEf',
    ctaLabel: 'Únete en Discord',

    // --- Vídeo / Imágenes ---
    posterVideo:  'assets/events/xenothreat/xeno2.mp4',
    posterImg:    'assets/events/xenothreat/cartel.jpg',
    eventLogoImg: 'assets/events/xenothreat/alfilo-transparent.png',
  },

];
