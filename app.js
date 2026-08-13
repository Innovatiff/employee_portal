// ══════════════════════════════════════════════════════════
//  El Águila — Portal del Colaborador
//
//  Cada colaborador entra con su correo y su contraseña. La cuenta la
//  crea la gerencia al contratar, y deja constancia en Colaboradores/{uid},
//  que es lo que las reglas de Firestore usan para saber a quién
//  pertenece la sesión. Sin esa ficha no se puede leer nada propio.
//
//  Los nombres de las colecciones se mantienen en inglés porque son los
//  mismos documentos que usa el software de gerencia.
// ══════════════════════════════════════════════════════════

firebase.initializeApp({
  apiKey: "AIzaSyDtOfZXPEP-k_gvvu3Lvt307mOLBWezMrw",
  authDomain: "domcub.firebaseapp.com",
  projectId: "domcub",
  storageBucket: "domcub.firebasestorage.app",
  messagingSenderId: "329163319008",
  appId: "1:329163319008:web:1c7d3e71252ec4f5641285",
  measurementId: "G-668H2W780D"
});
// Clave pública de notificaciones push (VAPID). Firebase Console →
// Configuración del proyecto → Cloud Messaging → Certificados push web.
// Vacía = sin avisos con la app cerrada; el resto funciona igual.
const VAPID_KEY = "BDyHLK04-tsVFXfN8sIXgKgGmM0qZpYgoblgKqVLIWgH8J0oktFacUXlTIKt2nFQPMqPmzamcTt3S7zOkIRjB74";

const db   = firebase.firestore();
const auth = firebase.auth();

// ── Tiendas ──
const STORES = {
  '1': { name:'Tienda Despensas', short:'Despensas', color:'#b45309', soft:'#fef3c7', icon:'basket-outline' },
  '2': { name:'Tienda Cocina',    short:'Cocina',    color:'#0e7490', soft:'#cffafe', icon:'restaurant-outline' }
};
const storeName  = id => (STORES[id]||{}).name  || '—';
const storeShort = id => (STORES[id]||{}).short || '—';

// ── Fechas en español ──
const MESES  = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const MCORTO = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
const DIAS   = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
const DCORTO = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

const toDateStr = d => { const x=new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`; };
const todayStr = () => toDateStr(new Date());
const parseD = v => v ? new Date(String(v).includes('T') ? v : v+'T00:00:00') : null;

function fDate(v)      { const d=parseD(v); return d&&!isNaN(d) ? `${d.getDate()} ${MCORTO[d.getMonth()]} ${d.getFullYear()}` : '—'; }
function fDateShort(v) { const d=parseD(v); return d&&!isNaN(d) ? `${d.getDate()} ${MCORTO[d.getMonth()]}` : '—'; }
function fDateLong(d)  { const x=new Date(d); return `${DIAS[x.getDay()]}, ${x.getDate()} de ${MESES[x.getMonth()]}`; }
function fTime(v) {
  if (!v) return '—';
  const d = v && v.toDate ? v.toDate() : new Date(v);
  if (isNaN(d)) return '—';
  let h = d.getHours(); const m = String(d.getMinutes()).padStart(2,'0');
  const s = h < 12 ? 'a. m.' : 'p. m.'; h = h % 12 || 12;
  return `${h}:${m} ${s}`;
}
function relTime(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const s = (Date.now() - d.getTime())/1000;
  if (s < 60)     return 'ahora';
  if (s < 3600)   return `${Math.floor(s/60)} min`;
  if (s < 86400)  return fTime(d);
  if (s < 172800) return 'ayer';
  return fDateShort(toDateStr(d));
}

// Formato monetario explícito: el CLDR español no agrupa 4 cifras.
function money(n) {
  const v = Number(n) || 0;
  const [e,d] = Math.abs(v).toFixed(2).split('.');
  return (v<0?'-$':'$') + e.replace(/\B(?=(\d{3})+(?!\d))/g,'.') + ',' + d;
}

const esc = s => String(s==null?'':s)
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  .replace(/"/g,'&quot;').replace(/'/g,'&#39;');

// ── Períodos quincenales, anclados al 1 de enero de 2024 ──
const ORIGIN = new Date('2024-01-01T00:00:00');
const perIndex = d => { const x=new Date(d); x.setHours(0,0,0,0);
  return Math.floor(Math.floor((x-ORIGIN)/86400000)/14); };
function perByIndex(i) {
  const s = new Date(ORIGIN); s.setDate(s.getDate()+i*14);
  const e = new Date(s); e.setDate(e.getDate()+13);
  return { index:i, start:toDateStr(s), end:toDateStr(e) };
}
const curPeriod = () => perByIndex(perIndex(new Date()));
function perLabel(p) {
  const s=parseD(p.start), e=parseD(p.end);
  return `${s.getDate()} ${MCORTO[s.getMonth()]} – ${e.getDate()} ${MCORTO[e.getMonth()]}`;
}

// ── Avatares ──
const AV = ['#4f46e5','#0891b2','#059669','#d97706','#dc2626','#7c3aed','#0284c7','#be185d'];
function avColor(n){ let h=0; for(const c of (n||'')) h=(h*31+c.charCodeAt(0))%AV.length; return AV[Math.abs(h)%AV.length]; }
function inits(n){ const p=(n||'').trim().split(' ');
  return (p.length>=2 ? p[0][0]+p[p.length-1][0] : (n||'?').slice(0,2)).toUpperCase(); }
function avatar(n, size) {
  const s = size||40;
  return `<div class="avatar" style="width:${s}px;height:${s}px;background:${avColor(n)};font-size:${Math.round(s*0.36)}px">${inits(n)}</div>`;
}

// ── Avisos ──
function toast(msg, kind) {
  let host = document.querySelector('.toasts');
  if (!host) { host=document.createElement('div'); host.className='toasts'; document.body.appendChild(host); }
  const ic = { ok:'checkmark-circle-outline', err:'alert-circle-outline', info:'information-circle-outline' }[kind||'info'];
  const el = document.createElement('div');
  el.className = 'toast ' + (kind||'info');
  el.innerHTML = `<ion-icon name="${ic}"></ion-icon><span>${esc(msg)}</span>`;
  host.appendChild(el);
  setTimeout(() => { el.style.opacity='0'; setTimeout(()=>el.remove(),300); }, 3200);
}

// ── Hoja inferior ──
function openSheet(html) {
  document.getElementById('sheetBody').innerHTML = html;
  document.getElementById('sheetBg').classList.add('on');
  document.getElementById('sheet').classList.add('on');
}
function closeSheet() {
  document.getElementById('sheetBg').classList.remove('on');
  document.getElementById('sheet').classList.remove('on');
}

// ══════════════════════════════════════════════════════════
//  Sesión
// ══════════════════════════════════════════════════════════
let ME = null;   // { uid, employeeId, pid, name, store, canPedidos, rate, jobTitle }

async function loadSession(user) {
  // Colaboradores/{uid} es lo que la gerencia creó al contratar.
  const link = await db.collection('Colaboradores').doc(user.uid).get();
  if (!link.exists) {
    throw new Error('Esta cuenta no está vinculada a ningún colaborador. Pídele a tu gerente que revise tu alta.');
  }
  const empId = link.data().employeeId;
  const doc   = await db.collection('Employees').doc(empId).get();
  if (!doc.exists) throw new Error('No encontramos tu ficha. Habla con tu gerente.');

  const e = doc.data();
  if (e.status !== 'active') throw new Error('Tu cuenta está inactiva. Habla con tu gerente.');

  let jobTitle = '—';
  if (e.jobId) {
    const j = await db.collection('Jobs').doc(e.jobId).get();
    if (j.exists) jobTitle = j.data().title;
  }

  ME = {
    uid: user.uid, employeeId: empId, pid: 'emp:'+empId,
    name: e.name, email: e.email, store: e.store,
    rate: Number(e.hourlyRate||0), jobTitle,
    canPedidos: !!e.canPedidos, canRegistros: !!e.canRegistros, hireDate: e.hireDate
  };

  // Las reglas del chat resuelven la identidad por aquí.
  await db.collection('UserIndex').doc(user.uid).set({
    pid: ME.pid, name: ME.name, role:'colaborador',
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge:true });

  return ME;
}

// ══════════════════════════════════════════════════════════
//  Datos — todo acotado a la propia persona, como exigen las reglas
// ══════════════════════════════════════════════════════════
async function myClockIns(from, to) {
  const snap = await db.collection('ClockIns')
    .where('employeeId','==',ME.employeeId)
    .get();
  return snap.docs.map(d=>({id:d.id,...d.data()}))
    .filter(c => !from || (c.date >= from && c.date <= to))
    .sort((a,b)=>String(b.date).localeCompare(String(a.date)));
}

/**
 * El turno abierto, sea de hoy o de otro día. Sin filtrar por fecha a
 * propósito: quien olvida marcar la salida deja el turno abierto, y si sólo
 * se miraran las marcas de hoy no lo vería nunca —ni sabría por qué le
 * faltan horas en la nómina—.
 */
async function myOpenShift() {
  const snap = await db.collection('ClockIns')
    .where('employeeId','==',ME.employeeId)
    .where('clockOut','==',null).get();
  if (snap.empty) return null;
  const abiertos = snap.docs.map(d => ({ id:d.id, ...d.data() }))
    .sort((a,b) => String(b.date||'').localeCompare(String(a.date||'')));
  return abiertos[0];
}

async function myPayStatements() {
  const snap = await db.collection('PayStatements')
    .where('employeeId','==',ME.employeeId).get();
  return snap.docs.map(d=>({id:d.id,...d.data()}))
    .sort((a,b)=>String(b.periodStart||'').localeCompare(String(a.periodStart||'')));
}

async function myTimeOff() {
  const snap = await db.collection('TimeOff')
    .where('employeeId','==',ME.employeeId).get();
  return snap.docs.map(d=>({id:d.id,...d.data()}))
    .sort((a,b)=>String(b.startDate||'').localeCompare(String(a.startDate||'')));
}

async function requestTimeOff(data) {
  await db.collection('TimeOff').add({
    ...data, employeeId: ME.employeeId, status:'pending',
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

async function storePedidos() {
  const snap = await db.collection('Pedidos').where('store','==',ME.store).get();
  return snap.docs.map(d=>({id:d.id,...d.data()}))
    .sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
}

async function savePedido(data, id) {
  if (id) {
    await db.collection('Pedidos').doc(id).update({
      ...data, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
    return id;
  }
  const ref = await db.collection('Pedidos').add({
    ...data, store: ME.store,
    createdBy: ME.employeeId, createdByName: ME.name,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  return ref.id;
}

const PED_ESTADO = {
  borrador: { label:'Borrador', badge:'b-gray' },
  enviado:  { label:'Enviado',  badge:'b-amber' },
  recibido: { label:'Recibido', badge:'b-green' }
};

// ── Registros de viaje (kilometraje de las salidas) ──

async function miViajeAbierto() {
  const snap = await db.collection('Registros')
    .where('employeeId','==',ME.employeeId)
    .where('status','==','en-ruta').get();
  if (snap.empty) return null;
  const abiertos = snap.docs.map(d => ({ id:d.id, ...d.data() }))
    .sort((a,b) => (b.horaSalida?.toMillis?.()||0) - (a.horaSalida?.toMillis?.()||0));
  return abiertos[0];
}

async function misViajes(limite) {
  const snap = await db.collection('Registros')
    .where('employeeId','==',ME.employeeId).get();
  return snap.docs.map(d => ({ id:d.id, ...d.data() }))
    .sort((a,b) => String(b.date).localeCompare(String(a.date))
      || (b.horaSalida?.toMillis?.()||0) - (a.horaSalida?.toMillis?.()||0))
    .slice(0, limite || 20);
}

/** Los carros de la tienda y dónde quedó el cuentakilómetros de cada uno. */
async function carrosDeTienda() {
  const snap = await db.collection('Registros').where('store','==',ME.store).get();
  const regs = snap.docs.map(d => d.data())
    .sort((a,b) => String(b.date).localeCompare(String(a.date))
      || (b.horaSalida?.toMillis?.()||0) - (a.horaSalida?.toMillis?.()||0));
  const carros = {};
  regs.forEach(r => {
    const v = (r.vehiculo || '').trim();
    if (!v) return;
    if (!(v in carros)) carros[v] = null;
    if (carros[v] === null && r.status === 'completado' && r.kmLlegada) carros[v] = r.kmLlegada;
  });
  return carros;   // { 'Toyota blanco': 45230.5, ... }
}

async function salirDeViaje(vehiculo, kmSalida, horaSalida) {
  const ref = await db.collection('Registros').add({
    employeeId: ME.employeeId, employeeName: ME.name, store: ME.store,
    vehiculo, date: todayStr(),
    kmSalida, horaSalida,
    kmLlegada: null, horaLlegada: null, km: null, minutos: null,
    status: 'en-ruta',
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  return ref.id;
}

async function llegarDeViaje(id, kmLlegada, horaLlegada) {
  const doc = await db.collection('Registros').doc(id).get();
  if (!doc.exists) throw new Error('Ese viaje ya no existe');
  const r = doc.data();
  const km = Math.round((kmLlegada - r.kmSalida) * 10) / 10;
  const minutos = r.horaSalida && horaLlegada
    ? Math.max(0, Math.round((horaLlegada.toMillis() - r.horaSalida.toMillis()) / 60000))
    : null;
  await db.collection('Registros').doc(id).update({
    kmLlegada, horaLlegada, km, minutos, status: 'completado'
  });
  return { km, minutos };
}

function durLabel(min) {
  if (min == null) return '—';
  const h = Math.floor(min/60), m = min%60;
  return h ? `${h} h ${String(m).padStart(2,'0')} min` : `${m} min`;
}

// ── Horario ──
// Un documento por semana y tienda; el colaborador sólo pinta su fila.

function lunesDe(fecha) {
  const d = fecha instanceof Date ? new Date(fecha) : parseD(fecha);
  d.setHours(0,0,0,0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return toDateStr(d);
}
function diasDeSemana(lunes) {
  const base = parseD(lunes);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base); d.setDate(d.getDate() + i);
    return toDateStr(d);
  });
}
async function miHorario(lunes) {
  const doc = await db.collection('Horarios').doc(`${lunes}_${ME.store}`).get();
  if (!doc.exists) return {};
  return (doc.data().shifts || {})[ME.employeeId] || {};
}

// ── Chat ──
// Los anuncios son por tienda: cada quien ve los de la suya.
const anunciosId = () => 'anuncios_' + ME.store;

/** Nunca deja una promesa colgada: si tarda de más, se rinde. */
function conTiempo(promesa, ms, queHacia) {
  return Promise.race([
    promesa,
    new Promise((_, fail) => setTimeout(
      () => fail(new Error('Se agotó el tiempo ' + queHacia)), ms))
  ]);
}

function aBlob(canvas, calidad) {
  return new Promise((ok, fail) => {
    if (!canvas.toBlob) {
      // Safari antiguo: se arma el blob a mano desde el data URL
      try {
        const s = canvas.toDataURL('image/jpeg', calidad).split(',')[1];
        const bin = atob(s);
        const buf = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
        return ok(new Blob([buf], { type:'image/jpeg' }));
      } catch (e) { return fail(e); }
    }
    canvas.toBlob(b => b ? ok(b) : fail(new Error('El navegador no pudo comprimir la imagen')),
                  'image/jpeg', calidad);
  });
}

/**
 * Reduce la foto antes de subirla.
 *
 * En iPhone esto es lo delicado. Una foto de la cámara son 12 megapíxeles;
 * descodificarla ya cuesta, Safari limita el tamaño de los lienzos y a
 * veces deja `toBlob` sin responder. Por eso se descodifica UNA sola vez
 * —medir y reescalar por separado duplicaba el trabajo—, todo lleva tiempo
 * máximo para que ninguna promesa quede colgada, y si algo falla quien
 * llama sube la foto original en vez de rendirse.
 */
async function encogerImagen(file, maxLado = 1200, calidad = 0.68) {
  const dibujar = (fuente, anchoO, altoO) => {
    const e = Math.min(1, maxLado / Math.max(anchoO, altoO));
    const w = Math.max(1, Math.round(anchoO * e));
    const h = Math.max(1, Math.round(altoO * e));
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingQuality = 'medium';
    ctx.drawImage(fuente, 0, 0, w, h);
    return { c, w, h };
  };

  if (typeof createImageBitmap === 'function') {
    let bmp = null;
    try {
      bmp = await conTiempo(createImageBitmap(file), 15000, 'al abrir la foto');
      const { c, w, h } = dibujar(bmp, bmp.width, bmp.height);
      const blob = await conTiempo(aBlob(c, calidad), 15000, 'al comprimir la foto');
      return { blob, w, h };
    } catch (e) {
      console.warn('createImageBitmap no sirvió, se prueba con <img>:', e);
    } finally {
      if (bmp && bmp.close) bmp.close();
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const img = await conTiempo(new Promise((ok, fail) => {
      const i = new Image();
      i.onload  = () => ok(i);
      i.onerror = () => fail(new Error('El navegador no pudo abrir esa imagen'));
      i.src = url;
    }), 15000, 'al abrir la foto');

    const { c, w, h } = dibujar(img, img.naturalWidth || img.width, img.naturalHeight || img.height);
    const blob = await conTiempo(aBlob(c, calidad), 15000, 'al comprimir la foto');
    return { blob, w, h };
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function enviarFoto(chatId, file, onProgreso) {
  if (file.type && !file.type.startsWith('image/')) {
    throw new Error('Sólo se pueden enviar imágenes');
  }
  if (file.size > 12 * 1024 * 1024)    throw new Error('La imagen es demasiado grande');

  // Encoger ocurre ANTES de que empiece la subida: sin avisar de esta fase
  // el porcentaje se queda en cero y parece colgado.
  if (onProgreso) onProgreso(null);

  // Si reducirla falla —Safari con una foto enorme, un formato que no sabe
  // dibujar— se sube tal cual. Tarda más, pero la foto llega. Quedarse sin
  // enviar nada sería el peor resultado.
  let blob, w = 0, h = 0;
  try {
    ({ blob, w, h } = await encogerImagen(file));
  } catch (e) {
    console.warn('No se pudo reducir la foto, se sube original:', e);
    blob = file;
  }

  const nombre = `${Date.now()}_${Math.random().toString(36).slice(2,9)}.jpg`;
  const ref = firebase.storage().ref(`chat/${chatId}/${nombre}`);

  // Con el porcentaje a la vista la espera se hace corta; sin él, cualquier
  // segundo parece que se colgó.
  // El original de un iPhone puede ser HEIC; declararlo mal haría que no se
  // viera.
  const tarea = ref.put(blob, { contentType: blob.type || 'image/jpeg' });
  await new Promise((ok, fail) => {
    tarea.on('state_changed',
      s => { if (onProgreso && s.totalBytes) onProgreso(Math.round(s.bytesTransferred / s.totalBytes * 100)); },
      fail, ok);
  });
  const url = await ref.getDownloadURL();

  await db.collection('Messages').add({
    chatId, senderId: ME.pid, senderName: ME.name, senderRole:'colaborador',
    type:'image', url, w, h, text:'',
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  await db.collection('Chats').doc(chatId).set({
    lastMessage:'Foto', lastSender: ME.pid,
    lastAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge:true });
}
const dmId = (a,b) => 'dm_' + [a,b].sort().join('__');

async function ensureDm(otherPid, names) {
  const id = dmId(ME.pid, otherPid);
  // No se consulta antes si existe: las reglas deciden quién puede leer un
  // chat mirando sus participantes, y en un documento que aún no existe no
  // hay participantes que mirar, así que la lectura se deniega y la
  // conversación nunca nacía. Con merge sirve igual para crear que para
  // actualizar, y no se pisa el último mensaje.
  await db.collection('Chats').doc(id).set({
    type:'dm', participants:[ME.pid, otherPid], names:names||{}
  }, { merge:true });
  return id;
}

async function sendMessage(chatId, text) {
  const t = String(text||'').trim();
  if (!t) return;
  await db.collection('Messages').add({
    chatId, senderId: ME.pid, senderName: ME.name, senderRole:'colaborador',
    text: t, createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  await db.collection('Chats').doc(chatId).set({
    lastMessage: t.slice(0,80),
    lastSender:  ME.pid,   // para no avisarte de tus propios mensajes
    lastAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge:true });
}

// Se ordena en el cliente para no exigir índices compuestos.
function listenMessages(chatId, cb) {
  return db.collection('Messages').where('chatId','==',chatId)
    .onSnapshot(s => cb(s.docs.map(d=>({id:d.id,...d.data()}))
      .sort((a,b) => (a.createdAt?.toMillis?.()||0) - (b.createdAt?.toMillis?.()||0))),
      e => console.error('listenMessages', e));
}

// Las reglas sólo dejan leer las conversaciones propias, así que la
// escucha va acotada; anuncios se sigue por separado porque es pública.
function listenChats(cb) {
  const st = { mine:[], anuncios:null, tienda:null };
  const emit = () => cb(st.mine
    .concat(st.anuncios ? [st.anuncios] : [])
    .concat(st.tienda ? [st.tienda] : []));
  const a = db.collection('Chats').where('participants','array-contains',ME.pid)
    .onSnapshot(s => { st.mine = s.docs.map(d=>({id:d.id,...d.data()})); emit(); },
                e => console.error('chats mine', e));
  const b = db.collection('Chats').doc(anunciosId())
    .onSnapshot(d => { st.anuncios = d.exists ? {id:d.id,...d.data()} : null; emit(); },
                e => console.error('chats anuncios', e));
  // El canal de MI tienda: no lleva participantes, se escucha aparte.
  const c = db.collection('Chats').doc('tienda_' + ME.store)
    .onSnapshot(d => { st.tienda = d.exists ? {id:d.id,...d.data()} : null; emit(); },
                e => console.error('chats tienda', e));
  return () => { a(); b(); c(); };
}

// Canal fijo de la tienda; las reglas sólo dejan entrar a su gente.
async function ensureTienda() {
  const id = 'tienda_' + ME.store;
  await db.collection('Chats').doc(id).set({
    type:'tienda', store: ME.store, title: 'Chat de ' + storeShort(ME.store)
  }, { merge:true });
  return id;
}


// ══ Avisos de mensajes nuevos ══
//
// No leído = el chat tiene algo más reciente que la última vez que lo abrí,
// y no lo escribí yo. La marca se guarda en este teléfono: así no hacen
// falta reglas nuevas, y "leído" es de verdad por dispositivo.

const leidoKey = () => 'elaguila_leido_' + (ME ? ME.pid : 'anon');

function leidoMap() {
  try { return JSON.parse(localStorage.getItem(leidoKey()) || '{}'); }
  catch (e) { return {}; }
}
function marcarLeido(chatId) {
  const m = leidoMap();
  m[chatId] = Date.now();
  try { localStorage.setItem(leidoKey(), JSON.stringify(m)); } catch (e) {}
}
const msOf = ts => (ts && ts.toMillis ? ts.toMillis() : 0);

function sinLeer(chats) {
  const l = leidoMap();
  return chats.filter(c => {
    const t = msOf(c.lastAt);
    return t && c.lastSender !== ME.pid && t > (l[c.id] || 0);
  }).sort((a,b) => msOf(b.lastAt) - msOf(a.lastAt));
}

// ══ Visto y reacciones ══
//
// "Visto" se comparte: al tener una conversación abierta se anota la hora
// en Chats/{id}.vistos[miPid], y el que envió ve el "Visto" bajo su
// mensaje. La marca local de arriba sigue mandando para el punto rojo.

const vistoEscrito = {};   // anti-bucle: escribir dispara el snapshot que
                           // vuelve aquí; sólo se escribe si hay algo nuevo.
function marcarVisto(chatId, lastAtMs) {
  if (!ME) return;
  const t = lastAtMs || Date.now();
  if (vistoEscrito[chatId] && vistoEscrito[chatId] >= t) return;
  vistoEscrito[chatId] = t;
  const campo = {}; campo['vistos.' + ME.pid] = firebase.firestore.FieldValue.serverTimestamp();
  db.collection('Chats').doc(chatId).update(campo)
    .catch(e => console.warn('marcarVisto', e));
}

const REACCION = { up:'👍', love:'❤️', down:'👎' };

// Poner, cambiar o quitar (si ya era la misma) la reacción propia.
async function reaccionar(msgId, tipo, actual) {
  const campo = {};
  campo['reacciones.' + ME.pid] =
    actual === tipo ? firebase.firestore.FieldValue.delete() : tipo;
  await db.collection('Messages').doc(msgId).update(campo);
}


// ══ Notificaciones con la app cerrada (Firebase Cloud Messaging) ══
//
// Los avisos de la campana sólo existen con la app abierta. Para que
// llegue algo al teléfono con la app cerrada: este aparato pide permiso y
// obtiene un token, el token se guarda en PushTokens/{token} = { pid }, y
// al escribirse un mensaje una Cloud Function manda la push a quien toca.
// Desde aquí no se puede enviar: haría falta una credencial de servidor.

async function activarPush() {
  try {
    if (!VAPID_KEY || !('serviceWorker' in navigator) || !('Notification' in window)
        || !firebase.messaging) return false;

    const permiso = await Notification.requestPermission();
    if (permiso !== 'granted') return false;

    const reg = await navigator.serviceWorker.register('firebase-messaging-sw.js');
    const messaging = firebase.messaging();
    const token = await messaging.getToken({
      vapidKey: VAPID_KEY, serviceWorkerRegistration: reg });
    if (!token) return false;

    await db.collection('PushTokens').doc(token).set({
      pid: ME.pid, name: ME.name,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge:true });

    // Con la app abierta el sistema no muestra la push: llega aquí.
    messaging.onMessage(p => {
      const n = p.notification || {};
      if (n.title) toast(n.title + ': ' + (n.body || 'mensaje nuevo'), 'info');
    });
    return true;
  } catch (err) { console.error('activarPush:', err); return false; }
}

/**
 * Si ya hay permiso, se renueva el token en silencio (cambia al
 * reinstalar). Si no, se ofrece un botón: pedirlo de golpe al entrar es
 * justo lo que la gente rechaza, y el navegador no vuelve a preguntar.
 */
// En iPhone, Safari sólo permite pedir el permiso si la app está añadida a
// la pantalla de inicio. Mientras se abra como página normal, `Notification`
// ni siquiera existe, así que no hay nada que ofrecer: hay que explicar el
// paso que falta en vez de no mostrar nada.
const esIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const estaInstalada = () => window.navigator.standalone === true
  || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);

function avisarInstalar() {
  if (localStorage.getItem('elaguila_instalar_no')) return;
  const bar = document.createElement('div');
  bar.className = 'push-ask';
  bar.innerHTML = `
    <ion-icon name="share-outline"></ion-icon>
    <div style="flex:1">
      <div class="push-ask-t">Instala la app para recibir avisos</div>
      <div class="push-ask-s">
        Toca <strong>Compartir</strong> abajo y elige <strong>Añadir a inicio</strong>.
        Luego abre El Águila desde el icono nuevo.
      </div>
    </div>
    <button class="push-no" aria-label="Ahora no"><ion-icon name="close-outline"></ion-icon></button>`;
  bar.querySelector('.push-no').onclick = () => {
    localStorage.setItem('elaguila_instalar_no', '1');
    bar.remove();
  };
  document.querySelector('.appbar').insertAdjacentElement('afterend', bar);
}

function setupPush() {
  if (!VAPID_KEY) return;
  if (!('Notification' in window)) {
    // En iPhone sin instalar, ésta es justo la situación: se explica.
    if (esIOS() && !estaInstalada()) avisarInstalar();
    return;
  }
  if (Notification.permission === 'granted') { activarPush(); return; }
  if (Notification.permission === 'denied')  return;
  if (localStorage.getItem('elaguila_push_no')) return;

  const bar = document.createElement('div');
  bar.className = 'push-ask';
  bar.innerHTML = `
    <ion-icon name="notifications-outline"></ion-icon>
    <div style="flex:1">
      <div class="push-ask-t">Avisos en tu teléfono</div>
      <div class="push-ask-s">Entérate de los mensajes sin abrir la app</div>
    </div>
    <button class="push-si">Activar</button>
    <button class="push-no" aria-label="Ahora no"><ion-icon name="close-outline"></ion-icon></button>`;
  bar.querySelector('.push-si').onclick = async () => {
    const ok = await activarPush();
    toast(ok ? 'Avisos activados' : 'No se pudieron activar', ok ? 'ok' : 'err');
    bar.remove();
  };
  bar.querySelector('.push-no').onclick = () => {
    localStorage.setItem('elaguila_push_no', '1');
    bar.remove();
  };
  document.querySelector('.appbar').insertAdjacentElement('afterend', bar);
}

// ══ Tareas del día (checklists de mi tienda) ══

async function getTareasHoy() {
  const snap = await db.collection('Tareas').where('store','==',ME.store).get();
  const dow = new Date().getDay();
  return snap.docs.map(d => ({ id:d.id, ...d.data() }))
    .filter(t => !Array.isArray(t.dias) || !t.dias.length || t.dias.includes(dow))
    .sort((a,b) => String(a.titulo||'').localeCompare(String(b.titulo||'')));
}

async function getHechosHoy() {
  const snap = await db.collection('TareasHechas')
    .where('date','==',todayStr()).where('store','==',ME.store).get();
  const por = {};
  snap.docs.forEach(d => { por[d.data().tareaId] = { id:d.id, ...d.data() }; });
  return por;
}

// Marcar o desmarcar un renglón; el documento del día se crea solo.
async function marcarItem(tareaId, idx, hecho) {
  const quien = hecho
    ? { nombre: ME.name, pid: ME.pid, at: Date.now() }
    : firebase.firestore.FieldValue.delete();
  await db.collection('TareasHechas').doc(tareaId + '_' + todayStr()).set({
    tareaId, date: todayStr(), store: ME.store, hechos: { [idx]: quien }
  }, { merge:true });
}

// ══ Reportes de incidentes ══

async function misReportes() {
  const snap = await db.collection('Reportes').where('por','==',ME.pid).get();
  return snap.docs.map(d => ({ id:d.id, ...d.data() }))
    .sort((a,b) => (b.createdAt?.toMillis?.()||0) - (a.createdAt?.toMillis?.()||0));
}

// Crear un reporte; si trae foto se reduce y se sube primero.
async function crearReporte({ texto, file }, onProgreso) {
  let foto = null, w = 0, h = 0;
  if (file) {
    if (file.type && !file.type.startsWith('image/')) throw new Error('Sólo se pueden adjuntar imágenes');
    if (file.size > 12 * 1024 * 1024) throw new Error('La imagen es demasiado grande');
    if (onProgreso) onProgreso(null);
    let blob;
    try { ({ blob, w, h } = await encogerImagen(file)); }
    catch (e) { console.warn('se sube original:', e); blob = file; }
    const nombre = `${Date.now()}_${Math.random().toString(36).slice(2,9)}.jpg`;
    const ref = firebase.storage().ref(`reportes/${nombre}`);
    const tarea = ref.put(blob, { contentType: blob.type || 'image/jpeg' });
    await new Promise((ok, fail) => {
      tarea.on('state_changed',
        s => { if (onProgreso && s.totalBytes) onProgreso(Math.round(s.bytesTransferred/s.totalBytes*100)); },
        fail, ok);
    });
    foto = await ref.getDownloadURL();
  }
  await db.collection('Reportes').add({
    por: ME.pid, nombre: ME.name, store: ME.store,
    texto: String(texto||'').trim(), foto, w, h,
    date: todayStr(), status: 'nuevo',
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}
