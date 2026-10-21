const SMARTFEED = {
  // Use o MESMO nome nos dois aparelhos (TV e celular)
  sala: 'alimentapet-7h3k9qwz2m',
  broker: 'wss://broker.hivemq.com:8884/mqtt',

  topicoEstado() { return this.sala + '/estado'; },
  topicoComando() { return this.sala + '/comando'; },

  conectar(aoConectar) {
    if (typeof mqtt === 'undefined') {
      document.body.insertAdjacentHTML('afterbegin',
        '<div style="background:#7f1d1d;color:#fff;padding:12px;font-family:system-ui">' +
        'Não consegui carregar a biblioteca MQTT. Verifique a conexão com a internet ' +
        'ou desative bloqueadores de conteúdo e recarregue a página.</div>');
      return { connected: false, on() {}, subscribe() {}, publish() {} };
    }
    const c = mqtt.connect(this.broker, {
      clientId: 'sf-' + Math.random().toString(16).slice(2, 10),
      reconnectPeriod: 2000
    });
    c.on('connect', () => aoConectar(c));
    c.on('error', e => console.error('Erro MQTT:', e));
    return c;
  }
};
