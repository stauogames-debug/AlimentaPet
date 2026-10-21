const express = require('express');
const http = require('http');
const path = require('path');
const os = require('os');
const { WebSocketServer } = require('ws');

const app = express();
app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// ===== Estado do alimentador (simula o hardware) =====
const state = {
  capacity: 4000,       // gramas no reservatório (3.5 a 4.5 L de ração)
  hopper: 3200,         // ração atual no reservatório
  bowl: 0,              // ração no pote (balança de célula de carga)
  portion: 50,          // porção padrão da programação
  lock: true,           // trava de segurança da tampa (true = travada)
  auto: true,           // modo automático ligado
  meals: ['07:00', '12:00', '18:00', '22:00'], // 4 refeições/dia
  motor: false,         // motor girando?
  dispensing: 0,        // gramas que ainda faltam dispensar
  logs: []
};

const firedKeys = new Set(); // evita disparar a mesma refeição duas vezes

function log(msg) {
  const hora = new Date().toLocaleTimeString('pt-BR');
  state.logs.unshift(`${hora}  ${msg}`);
  state.logs = state.logs.slice(0, 8);
}

function broadcast() {
  const data = JSON.stringify({ type: 'state', state });
  wss.clients.forEach(c => { if (c.readyState === 1) c.send(data); });
}

function dispense(grams) {
  if (state.dispensing > 0) { log('Já está dispensando, aguarde'); return; }
  if (state.hopper <= 0) { log('Sem ração no reservatório!'); return; }
  state.dispensing = grams;
  log(`Dispensando ${grams} g`);
}

// ===== Motor de dispensação (roda a cada 200 ms) =====
setInterval(() => {
  if (state.dispensing > 0) {
    if (state.hopper <= 0) {
      state.dispensing = 0;
      state.motor = false;
      log('Reservatório vazio: dispensação interrompida');
      broadcast();
      return;
    }
    const passo = Math.min(2, state.dispensing, state.hopper); // ~10 g/s
    state.dispensing -= passo;
    state.hopper -= passo;
    state.bowl += passo;
    state.motor = true;
    if (state.dispensing <= 0) {
      state.motor = false;
      log('Porção concluída (balança registrou o peso)');
    }
    broadcast();
  } else if (state.motor) {
    state.motor = false;
    broadcast();
  }
}, 200);

// ===== Programação das 4 refeições =====
setInterval(() => {
  if (!state.auto) return;
  const agora = new Date();
  const hm = agora.toTimeString().slice(0, 5);
  const chave = agora.toDateString() + hm;
  if (state.meals.includes(hm) && !firedKeys.has(chave)) {
    firedKeys.add(chave);
    log(`Refeição programada das ${hm}`);
    dispense(state.portion);
    broadcast();
  }
}, 15000);

// ===== Comandos vindos do celular =====
wss.on('connection', ws => {
  ws.send(JSON.stringify({ type: 'state', state }));

  ws.on('message', raw => {
    let m;
    try { m = JSON.parse(raw); } catch { return; }

    switch (m.type) {
      case 'dispense':
        dispense(Number(m.grams) || state.portion);
        break;
      case 'setAuto':
        state.auto = !!m.value;
        log(`Modo automático ${state.auto ? 'ativado' : 'desativado'}`);
        break;
      case 'setLock':
        state.lock = !!m.value;
        log(`Tampa ${state.lock ? 'travada' : 'destravada'}`);
        break;
      case 'refill':
        if (state.lock) { log('Refil bloqueado: tampa travada'); break; }
        state.hopper = Math.min(state.capacity, state.hopper + 1000);
        log('Reservatório reabastecido (+1000 g)');
        break;
      case 'emptyBowl':
        state.bowl = 0;
        log('Pote esvaziado');
        break;
      case 'setPortion':
        state.portion = Number(m.grams) || 50;
        log(`Porção padrão: ${state.portion} g`);
        break;
    }
    broadcast();
  });
});

// ===== Inicia servidor e mostra endereços da rede local =====
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\nSmartFeed rodando na porta ${PORT}\n`);
  console.log('TV (mostra o interior):   http://localhost:' + PORT + '/tv.html');
  console.log('Celular (controle):       http://localhost:' + PORT + '/controle.html');

  Object.values(os.networkInterfaces()).flat().forEach(i => {
    if (i && i.family === 'IPv4' && !i.internal) {
      console.log(`\nNo celular, acesse: http://${i.address}:${PORT}/controle.html`);
    }
  });
  console.log('');
});
