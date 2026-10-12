// app.js
// Mamãe & Bento — lógica principal

import { firebaseConfig, frases, frasesNoturnas, DPP } from './firebase-config.js';

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth, signInWithPopup, GoogleAuthProvider,
  onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore, collection, doc, addDoc, deleteDoc,
  updateDoc, onSnapshot, query, orderBy, limit, serverTimestamp,
  getDoc, setDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/* =====================================================
   INICIALIZAÇÃO
   ===================================================== */
const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);
const provider = new GoogleAuthProvider();

let usuarioAtual = null;
let unsubscribeRemedios = null;
let unsubscribeDiario   = null;
let unsubscribeChutes   = null;

/* =====================================================
   CONSTANTES
   ===================================================== */
const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const META_CHUTES = 10;      // meta visual da sessão
const AUTO_RESET_MS = 2 * 60 * 60 * 1000; // 2 horas sem chute = nova sessão

/* =====================================================
   UTILITÁRIOS
   ===================================================== */
function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function calcularSemanaGestacao() {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const dum = new Date(DPP);
  dum.setDate(dum.getDate() - 280);
  dum.setHours(0, 0, 0, 0);

  const diasPassados = Math.floor((hoje - dum) / (1000 * 60 * 60 * 24));
  const semana = Math.floor(diasPassados / 7);

  return Math.max(1, Math.min(40, semana));
}

function calcularTrimestre(semana) {
  if (semana <= 13) return '1º trimestre';
  if (semana <= 27) return '2º trimestre';
  return '3º trimestre';
}

function tempoAteDPP() {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const dpp = new Date(DPP);
  dpp.setHours(0, 0, 0, 0);

  const dias = Math.round((dpp - hoje) / (1000 * 60 * 60 * 24));

  if (dias < 0)   return 'Já nasceu! 💙';
  if (dias === 0) return 'É hoje! 🎉';
  if (dias < 30)  return `Bento chega em ${dias} dia${dias > 1 ? 's' : ''}`;

  const meses = Math.floor(dias / 30);
  return `Bento chega em ${meses} ${meses > 1 ? 'meses' : 'mês'}`;
}

function ehNoturno() {
  const h = new Date().getHours();
  return h >= 20 || h < 6;
}

function frasesAleatoria() {
  const lista = ehNoturno() ? frasesNoturnas : frases;
  return lista[Math.floor(Math.random() * lista.length)];
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/* =====================================================
   MODO NOTURNO
   ===================================================== */
function aplicarModoNoturno() {
  if (ehNoturno()) {
    document.body.classList.add('noturno');
  } else {
    document.body.classList.remove('noturno');
  }
}

/* =====================================================
   BANNERS POR ABA
   ===================================================== */
const BANNERS = {
  remedios: {
    img: './assets/imagens/remedio.webp',
    titulo: 'Hora de se cuidar, Vic 💙'
  },
  diario: {
    img: './assets/imagens/quarto-acordada.webp',
    titulo: 'Como foi o dia? 💙'
  },
  chutes: {
    img: './assets/imagens/chutando.webp',
    titulo: 'Bento tá se mexendo? 👶'
  }
};

function trocarBanner(aba) {
  const banner = BANNERS[aba];
  if (!banner) return;

  const bannerEl = document.getElementById('banner');
  bannerEl.style.opacity = 0;

  setTimeout(() => {
    document.getElementById('banner-img').src = banner.img;
    document.getElementById('banner-titulo').textContent = banner.titulo;
    bannerEl.style.opacity = 1;
  }, 200);
}

/* =====================================================
   PARTÍCULAS
   ===================================================== */
function iniciarParticulas() {
  const container = document.getElementById('particulas');
  const emojis = ['💙', '🤍', '✨', '💫', '⭐', '🤱', '👶'];
  const quantidade = 14;

  for (let i = 0; i < quantidade; i++) {
    const p = document.createElement('div');
    p.className = 'particula';
    p.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    p.style.left = `${Math.random() * 100}%`;
    p.style.animationDuration = `${12 + Math.random() * 12}s`;
    p.style.animationDelay = `${Math.random() * 12}s`;
    p.style.fontSize = `${14 + Math.random() * 14}px`;
    container.appendChild(p);
  }
}

/* =====================================================
   CONFE TE
   ===================================================== */
function soltarConfete() {
  const emojis = ['💙', '✨', '🎉', '💫', '🤍'];
  for (let i = 0; i < 18; i++) {
    const c = document.createElement('div');
    c.className = 'confete';
    c.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    c.style.left = '50%';
    c.style.top  = '40%';
    c.style.setProperty('--dx', `${(Math.random() - 0.5) * 600}px`);
    c.style.setProperty('--rot', `${(Math.random() - 0.5) * 720}deg`);
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 1800);
  }
}

/* =====================================================
   CELEBRAÇÃO (modal)
   ===================================================== */
function mostrarCelebracao() {
  const modal = document.getElementById('celebracao');
  modal.classList.add('visivel');

  // confete
  soltarConfete();
  setTimeout(soltarConfete, 400);

  // fecha em 4s ou ao clicar
  const fechar = () => {
    modal.classList.remove('visivel');
    modal.removeEventListener('click', fechar);
  };
  modal.addEventListener('click', fechar);
  setTimeout(fechar, 4000);
}

/* =====================================================
   AUTENTICAÇÃO
   ===================================================== */
function atualizarTelaLogin(usuario) {
  const telaLogin = document.getElementById('tela-login');
  const appEl     = document.getElementById('app');

  if (usuario) {
    telaLogin.classList.add('escondida');
    appEl.style.display = 'block';
    carregarDados(usuario.uid);
    atualizarHeaderInfo();
    trocarBanner('remedios');
  } else {
    telaLogin.classList.remove('escondida');
    appEl.style.display = 'none';
    if (unsubscribeRemedios) unsubscribeRemedios();
    if (unsubscribeDiario)   unsubscribeDiario();
    if (unsubscribeChutes)   unsubscribeChutes();
  }
}

document.getElementById('btn-login').addEventListener('click', async () => {
  try {
    await signInWithPopup(auth, provider);
  } catch (e) {
    console.error('Erro no login:', e);
    alert('Não foi possível fazer login. Tente novamente.');
  }
});

document.getElementById('btn-sair').addEventListener('click', async () => {
  if (confirm('Deseja sair da conta?')) {
    await signOut(auth);
  }
});

onAuthStateChanged(auth, (usuario) => {
  usuarioAtual = usuario;
  atualizarTelaLogin(usuario);
});

/* =====================================================
   HEADER INFO
   ===================================================== */
function atualizarHeaderInfo() {
  const semana    = calcularSemanaGestacao();
  const trimestre = calcularTrimestre(semana);
  const tempo     = tempoAteDPP();

  document.getElementById('semana').textContent =
    `Semana ${semana} • ${trimestre} • ${tempo} 💙`;

  const fraseEl = document.getElementById('frase');
  fraseEl.style.opacity = 0;
  setTimeout(() => {
    fraseEl.textContent = frasesAleatoria();
    fraseEl.style.opacity = 1;
  }, 300);
}

// troca frase a cada 30s
setInterval(() => {
  if (!usuarioAtual) return;
  const fraseEl = document.getElementById('frase');
  fraseEl.style.opacity = 0;
  setTimeout(() => {
    fraseEl.textContent = frasesAleatoria();
    fraseEl.style.opacity = 1;
  }, 500);
}, 30000);

/* =====================================================
   NAVEGAÇÃO ENTRE ABAS
   ===================================================== */
document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    const aba = btn.dataset.aba;

    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('ativo'));
    btn.classList.add('ativo');

    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById(`tab-${aba}`).classList.add('active');

    trocarBanner(aba);

    // Rola pro topo (cobre window, html e body — funciona em qualquer navegador)
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.documentElement.scrollTo({ top: 0, behavior: 'smooth' });
    document.body.scrollTo({ top: 0, behavior: 'smooth' });

    if (aba === 'chutes') atualizarCronometro();
  });
});

/* =====================================================
   CARREGAR DADOS
   ===================================================== */
function carregarDados(uid) {
  // --- REMÉDIOS ---
  unsubscribeRemedios = onSnapshot(
    query(collection(db, 'usuarios', uid, 'remedios'), orderBy('horario')),
    (snap) => {
      const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderizarRemedios(lista);
      atualizarProgresso(lista);
    }
  );

  // --- DIÁRIO ---
  unsubscribeDiario = onSnapshot(
    query(collection(db, 'usuarios', uid, 'diario'), orderBy('criadoEm', 'desc')),
    (snap) => {
      const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderizarDiario(lista);
    }
  );

  // --- CHUTES (sessões) ---
  unsubscribeChutes = onSnapshot(
    query(
      collection(db, 'usuarios', uid, 'chutes'),
      orderBy('inicio', 'desc'),
      limit(10)
    ),
    (snap) => {
      const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderizarChutes(lista);
    }
  );
}

/* =====================================================
   ABA REMÉDIOS
   ===================================================== */
let remediosHoje = [];
let notificouCelebracao = false;

function renderizarRemedios(lista) {
  const container = document.getElementById('lista-remedios');
  const hoje = hojeISO();
  const diaSemanaHoje = DIAS_SEMANA[new Date().getDay()];

  const deHoje = lista.filter(m => (m.dias || []).includes(diaSemanaHoje));
  remediosHoje = deHoje;

  if (deHoje.length === 0) {
    container.innerHTML = `
      <div class="vazio">
        <div class="vazio-icone">💊</div>
        Nenhum remédio para hoje ainda.
      </div>`;
    return;
  }

  container.innerHTML = deHoje.map(m => {
    const tomado = m.tomados && m.tomados[hoje];
    return `
      <div class="med-item ${tomado ? 'tomado' : ''}">
        <button class="med-check" onclick="window.toggleTomado('${m.id}', ${!tomado})">
          ${tomado ? '✓' : ''}
        </button>
        <div class="med-info">
          <div class="med-nome">${escapeHtml(m.nome)}</div>
          <div class="med-detalhes">
            <span>⏰ ${m.horario}</span>
            <span>📅 ${(m.dias || []).join(', ')}</span>
          </div>
        </div>
        <button class="btn-remover" onclick="window.removerRemedio('${m.id}')">🗑️</button>
      </div>
    `;
  }).join('');
}

function atualizarProgresso(lista) {
  const hoje = hojeISO();
  const diaSemanaHoje = DIAS_SEMANA[new Date().getDay()];

  const deHoje = lista.filter(m => (m.dias || []).includes(diaSemanaHoje));
  const total = deHoje.length;
  const tomados = deHoje.filter(m => m.tomados && m.tomados[hoje]).length;

  const pct = total === 0 ? 0 : Math.round((tomados / total) * 100);

  document.getElementById('progresso-texto').textContent = `${tomados} de ${total} tomados`;
  document.getElementById('progresso-fill').style.width = `${pct}%`;

  // Celebração: todos tomados (e pelo menos 1)
  if (total > 0 && tomados === total && !notificouCelebracao) {
    notificouCelebracao = true;
    setTimeout(() => mostrarCelebracao(), 500);
  }

  // Reset do flag se o dia mudar ou algum for desmarcado
  if (tomados < total) notificouCelebracao = false;
}

// Adicionar remédio
document.getElementById('form-remedio').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!usuarioAtual) return;

  const nome = document.getElementById('nome').value.trim();
  const horario = document.getElementById('horario').value;
  const dias = Array.from(document.querySelectorAll('#dias input:checked')).map(i => i.value);

  if (!nome || !horario || dias.length === 0) {
    alert('Preencha todos os campos.');
    return;
  }

  try {
    await addDoc(collection(db, 'usuarios', usuarioAtual.uid, 'remedios'), {
      nome, horario, dias,
      tomados: {},
      criadoEm: serverTimestamp()
    });
    e.target.reset();
  } catch (err) {
    console.error(err);
    alert('Erro ao salvar. Tente novamente.');
  }
});

// Toggle tomado
window.toggleTomado = async (id, valor) => {
  if (!usuarioAtual) return;
  const hoje = hojeISO();
  const ref = doc(db, 'usuarios', usuarioAtual.uid, 'remedios', id);
  const snap = await getDoc(ref);
  const tomados = (snap.data().tomados) || {};

  if (valor) {
    tomados[hoje] = true;
    soltarConfete();
  } else {
    delete tomados[hoje];
  }

  await updateDoc(ref, { tomados });
};

// Remover remédio
window.removerRemedio = async (id) => {
  if (!usuarioAtual) return;
  if (!confirm('Remover este remédio?')) return;
  await deleteDoc(doc(db, 'usuarios', usuarioAtual.uid, 'remedios', id));
};

/* =====================================================
   ABA DIÁRIO
   ===================================================== */
let humorSelecionado = '😊';

document.querySelectorAll('.humor-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.humor-btn').forEach(b => b.classList.remove('selecionado'));
    btn.classList.add('selecionado');
    humorSelecionado = btn.dataset.humor;
  });
});

document.querySelector('.humor-btn')?.classList.add('selecionado');

document.getElementById('form-diario').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!usuarioAtual) return;

  const texto = document.getElementById('texto-diario').value.trim();
  if (!texto) return;

  try {
    await addDoc(collection(db, 'usuarios', usuarioAtual.uid, 'diario'), {
      texto,
      humor: humorSelecionado,
      criadoEm: serverTimestamp()
    });
    e.target.reset();
    document.querySelectorAll('.humor-btn').forEach((b, i) => {
      b.classList.toggle('selecionado', i === 0);
    });
    humorSelecionado = '😊';
  } catch (err) {
    console.error(err);
    alert('Erro ao salvar entrada.');
  }
});

function renderizarDiario(lista) {
  const container = document.getElementById('lista-diario');

  if (lista.length === 0) {
    container.innerHTML = `
      <div class="vazio">
        <div class="vazio-icone">📖</div>
        O diário do Bento começa aqui. 💙
      </div>`;
    return;
  }

  container.innerHTML = lista.map(d => {
    const data = d.criadoEm?.toDate?.() || new Date();
    const dataFmt = data.toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'long', year: 'numeric'
    }) + ' • ' + data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    return `
      <div class="diario-item">
        <div class="diario-header">
          <span class="diario-data">${dataFmt}</span>
          <span class="diario-humor">${d.humor || '💙'}</span>
        </div>
        <div class="diario-texto">${escapeHtml(d.texto)}</div>
      </div>
    `;
  }).join('');
}

/* =====================================================
   ABA CHUTES (SESSÕES)
   ===================================================== */
let sessaoAtual = {
  chutes: 0,
  inicio: null,       // Date do primeiro chute
  ultimoChute: null,  // Date do último chute
  interval: null      // setInterval do cronômetro
};

// Inicia/reinicia a sessão
function iniciarSessaoSeNecessario() {
  const agora = new Date();

  // Se já tem sessão em andamento, verifica auto-reset
  if (sessaoAtual.inicio) {
    const decorrido = agora - sessaoAtual.ultimoChute;
    if (decorrido < AUTO_RESET_MS) return false; // continua a mesma sessão
    // senão, reseta (mas não salva a antiga se tiver 0 chutes)
    encerrarSessao(false);
  }

  sessaoAtual.chutes = 0;
  sessaoAtual.inicio = agora;
  sessaoAtual.ultimoChute = agora;

  document.getElementById('chute-numero').textContent = '0';
  atualizarAnel(0, META_CHUTES);

  if (sessaoAtual.interval) clearInterval(sessaoAtual.interval);
  sessaoAtual.interval = setInterval(atualizarCronometroTexto, 1000);
  atualizarCronometroTexto();

  document.getElementById('btn-encerrar').style.display = 'block';
  return true;
}

function atualizarCronometroTexto() {
  if (!sessaoAtual.inicio) return;
  const seg = Math.floor((Date.now() - sessaoAtual.inicio) / 1000);
  const h = String(Math.floor(seg / 3600)).padStart(2, '0');
  const m = String(Math.floor((seg % 3600) / 60)).padStart(2, '0');
  const s = String(seg % 60).padStart(2, '0');
  const txt = seg >= 3600 ? `${h}:${m}:${s}` : `${m}:${s}`;
  document.getElementById('cronometro').textContent = txt;
}

function atualizarAnel(atual, meta) {
  const pct = Math.min(atual / meta, 1);
  const circle = document.getElementById('anel-progresso');
  if (!circle) return;
  const raio = circle.r.baseVal.value;
  const circ = 2 * Math.PI * raio;
  circle.style.strokeDasharray = `${circ}`;
  circle.style.strokeDashoffset = `${circ * (1 - pct)}`;
}

// Botão "Bento chutou!"
document.getElementById('btn-chute').addEventListener('click', async () => {
  if (!usuarioAtual) return;

  iniciarSessaoSeNecessario();

  sessaoAtual.chutes++;
  sessaoAtual.ultimoChute = new Date();

  document.getElementById('chute-numero').textContent = sessaoAtual.chutes;
  atualizarAnel(sessaoAtual.chutes, META_CHUTES);

  const num = document.getElementById('chute-numero');
  num.classList.remove('pulsar');
  void num.offsetWidth;
  num.classList.add('pulsar');

  if (navigator.vibrate) navigator.vibrate(40);

  // Mensagem positiva ao atingir meta
  if (sessaoAtual.chutes === META_CHUTES) {
    soltarConfete();
    mostrarToast('Bento tá ativo e saudável! 💙');
  }

  // Salva incrementalmente (upsert por sessão)
  await salvarSessaoAtual();
});

// Encerrar sessão manualmente
document.getElementById('btn-encerrar').addEventListener('click', () => {
  if (sessaoAtual.chutes === 0) {
    encerrarSessao(false);
    return;
  }
  if (!confirm(`Encerrar sessão com ${sessaoAtual.chutes} chutes?`)) return;
  encerrarSessao(true);
});

function encerrarSessao(salvar) {
  if (sessaoAtual.interval) clearInterval(sessaoAtual.interval);

  if (salvar && sessaoAtual.chutes > 0) {
    salvarSessaoFinal();
  }

  sessaoAtual = {
    chutes: 0,
    inicio: null,
    ultimoChute: null,
    interval: null
  };

  document.getElementById('chute-numero').textContent = '0';
  document.getElementById('cronometro').textContent = '00:00';
  atualizarAnel(0, META_CHUTES);
  document.getElementById('btn-encerrar').style.display = 'none';
}

// Salva sessão em andamento (documento temporário por sessão)
async function salvarSessaoAtual() {
  if (!sessaoAtual.inicio || sessaoAtual.chutes === 0) return;

  const sessionId = sessaoAtual.inicio.getTime().toString();
  const ref = doc(db, 'usuarios', usuarioAtual.uid, 'chutes', sessionId);
  const agora = new Date();
  const duracaoSeg = Math.floor((agora - sessaoAtual.inicio) / 1000);

  await setDoc(ref, {
    data: hojeISO(),
    contagem: sessaoAtual.chutes,
    inicio: sessaoAtual.inicio,
    ultimoChute: agora,
    duracaoSeg,
    finalizada: false
  }, { merge: true });
}

async function salvarSessaoFinal() {
  if (!sessaoAtual.inicio) return;
  const sessionId = sessaoAtual.inicio.getTime().toString();
  const ref = doc(db, 'usuarios', usuarioAtual.uid, 'chutes', sessionId);
  const agora = new Date();
  const duracaoSeg = Math.floor((agora - sessaoAtual.inicio) / 1000);

  await setDoc(ref, {
    data: hojeISO(),
    contagem: sessaoAtual.chutes,
    inicio: sessaoAtual.inicio,
    fim: agora,
    duracaoSeg,
    finalizada: true
  }, { merge: true });
}

function renderizarChutes(lista) {
  const container = document.getElementById('lista-chutes');

  if (lista.length === 0) {
    container.innerHTML = `
      <div class="vazio">
        <div class="vazio-icone">👶</div>
        Nenhuma sessão registrada ainda.
      </div>`;
    return;
  }

  container.innerHTML = lista.map(c => {
    const data = c.inicio?.toDate?.() || new Date();
    const dataFmt = data.toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
    const hora = data.toLocaleTimeString('pt-BR', {
      hour: '2-digit', minute: '2-digit'
    });

    const dur = c.duracaoSeg || 0;
    const durFmt = dur >= 60
      ? `${Math.floor(dur / 60)}min`
      : `${dur}s`;

    const bateuMeta = c.contagem >= META_CHUTES;

    return `
      <div class="card sessao-card" style="display:flex; justify-content:space-between; align-items:center; gap:10px;">
        <div style="flex:1; min-width:0;">
          <div style="font-weight:700; font-size:14px; color: var(--azul-escuro);">
            📅 ${dataFmt} <span style="color: var(--texto-suave); font-weight:500;">• ${hora}</span>
          </div>
          <div style="font-size:12px; color: var(--texto-suave); margin-top:2px;">
            Duração: ${durFmt}
          </div>
        </div>
        <div style="text-align:right;">
          <div style="color: ${bateuMeta ? '#4CAF50' : 'var(--azul-medio)'}; font-weight:700; font-size:16px;">
            ${c.contagem} ${bateuMeta ? '✅' : '💙'}
          </div>
          <div style="font-size:11px; color: var(--texto-suave);">
            ${bateuMeta ? 'meta batida' : 'chutes'}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

/* =====================================================
   TOAST
   ===================================================== */
function mostrarToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('visivel');
  setTimeout(() => t.classList.remove('visivel'), 3000);
}

/* =====================================================
   INICIALIZAÇÃO FINAL
   ===================================================== */
aplicarModoNoturno();
setInterval(aplicarModoNoturno, 60000);
iniciarParticulas();
atualizarAnel(0, META_CHUTES);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js')
      .then((reg) => {
        console.log('[App] Service Worker registrado');

        // Detecta quando há uma nova versão esperando pra ativar
        reg.addEventListener('updatefound', () => {
          const novoWorker = reg.installing;
          if (!novoWorker) return;

          novoWorker.addEventListener('statechange', () => {
            if (novoWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[App] Nova versão detectada — atualizando...');
              // Avisa o SW pra assumir já
              novoWorker.postMessage('SKIP_WAITING');
            }
          });
        });

        // Se um SW novo assumir, recarrega a página uma vez
        let recarregou = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (recarregou) return;
          recarregou = true;
          console.log('[App] Recarregando com nova versão...');
          window.location.reload();
        });
      })
      .catch((err) => console.error('[App] Erro SW:', err));
  });
}