const SMARTFEED = {
  // TROQUE por um nome único, ex: 'smartfeed-stauo-x7k2m9'
  sala: 'smartfeed-stauo-x7k2m9',
  broker: 'wss://broker.hivemq.com:8884/mqtt',

  topicoEstado() { return this.sala + '/estado'; },
  topicoComando() { return this.sala + '/comando'; },

  conectar(aoConectar) {
    const c = mqtt.connect(this.broker, {
      clientId: 'sf-' + Math.random().toString(16).slice(2, 10)
    });
    c.on('connect', () => aoConectar(c));
    return c;
  }
};
