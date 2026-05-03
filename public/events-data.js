/* ============================================================
   ALFILO · REGISTRO CENTRAL DE EVENTOS
   ----------------------------------------------------------------
   Añade aquí cada nuevo evento. El sistema se encarga de:
   · Mostrar como popup si está dentro de fechas (startDate → endDate)
   · Mostrarlo en la sección de Eventos de la web siempre
   · Si hay varios activos a la vez: el de mayor priority abre
     como popup principal; los demás aparecen como botones
     flotantes en la esquina.
   ============================================================ */

window.ALFILO_EVENTS = [

  {
    id: 'streetbar-ourense-2026',
    priority: 1,                       // mayor número = más prioritario
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

];
