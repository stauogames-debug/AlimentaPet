const SMARTFEED = {
  // Use o MESMO nome nos dois aparelhos (TV e celular)
  sala: 'alimentapet-7h3k9qwz2m',
  broker: 'wss://broker.hivemq.com:8884/mqtt',

  topicoEstado() { return this.sala + '/estado'; },
  topicoComando() { return this.sala + '/comando'; },

  conectar(aoConectar) {
    const log = criarPainel();

    if (typeof mqtt === 'undefined') {
      log('ERRO: mqtt.min.js não carregou. Confira se o arquivo está na raiz do repositório.');
      return { connected: false, on() {}, subscribe() {}, publish() {} };
    }

    log('Conectando em ' + this.broker + ' ...');
    const c = mqtt.connect(this.broker, {
      clientId: 'sf-' + Math.random().toString(16).slice(2, 10),
      reconnectPeriod: 2000,
      connectTimeout: 10000
    });
    c.on('connect', () => { log('MQTT conectado'); aoConectar(c); });
    c.on('reconnect', () => log('Tentando reconectar...'));
    c.on('offline', () => log('Offline: não consegui falar com o broker'));
    c.on('error', e => log('Erro: ' + ((e && e.message) || e)));
    c.on('close', () => log('Conexão fechada'));
    return c;
  }
};

// Painel de diagnóstico no rodapé da tela (para ver erros no celular)
function criarPainel() {
  let box = document.getElementById('sf-debug');
  if (!box) {
    box = document.createElement('div');
    box.id = 'sf-debug';
    box.style.cssText =
      'position:fixed;left:0;right:0;bottom:0;max-height:35%;overflow:auto;' +
      'background:rgba(0,0,0,.85);color:#4ade80;font:12px monospace;padding:8px;z-index:99;';
    document.body.appendChild(box);
  }
  return msg => {
    const linha = document.createElement('div');
    linha.textContent = new Date().toLocaleTimeString('pt-BR') + '  ' + msg;
    box.appendChild(linha);
  };
}
