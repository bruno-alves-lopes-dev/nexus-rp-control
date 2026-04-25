# Dashboard multi-bot

Esta base deixa o painel pronto para:

- suportar multiplos bots pelo mesmo backend;
- separar acesso `admin` e `viewer`;
- sincronizar dados por bot;
- executar comandos remotos via fila;
- editar regras do painel e mandar o bot aplicar.

## Credenciais padrao

Se voce nao configurar variaveis no Render, o sistema sobe com:

- `admin` / `admin123`
- `viewer` / `viewer123`

Troque isso em producao com:

- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `VIEWER_USERNAME`
- `VIEWER_PASSWORD`

## Variaveis importantes

- `DASHBOARD_BOTS`: JSON com a lista inicial de bots.
- `DASHBOARD_USERS`: JSON com os usuarios iniciais.
- `DASHBOARD_STORE_FILE`: caminho do arquivo de persistencia.
- `PAINEL_URL`: URL do painel, usada no bot.
- `PAINEL_KEY` ou `BOT_KEY`: chave do bot para autenticar no painel.
- `PAINEL_BOT_ID`: id do bot no painel.

Exemplo de `DASHBOARD_BOTS`:

```json
[
  {
    "id": "nexus",
    "name": "Nexus",
    "description": "Bot principal da Nexus",
    "botKey": "segredo-nexus"
  },
  {
    "id": "atlas",
    "name": "Atlas",
    "description": "Segundo bot"
  }
]
```

## Integracao no bot

No bot, use o cliente novo:

```js
const { createPainelClient } = require('./sync-painel');

const painel = createPainelClient({
  panelUrl: process.env.PAINEL_URL,
  botId: 'nexus',
  botKey: process.env.PAINEL_KEY,
});

painel.sync('farm', farmDB);
painel.sync('caixa', caixaDB);

painel.registerCommands([
  {
    type: 'farm.reset',
    label: 'Resetar farm',
    description: 'Zera a semana atual',
    payloadExample: { confirmar: true },
  },
  {
    type: 'escala.publicar',
    label: 'Publicar escala',
    description: 'Publica a escala no Discord',
    payloadExample: { canal: '1234567890' },
  }
]);

setInterval(async () => {
  await painel.processCommands({
    'farm.reset': async () => {
      await resetarFarm();
      return { message: 'Farm resetado no bot.' };
    },
    'escala.publicar': async (payload) => {
      await publicarEscala(payload.canal);
      return { message: 'Escala publicada.' };
    },
  });
}, 5000);
```

## Observacao de persistencia

O painel grava um arquivo `dashboard-store.json`. Em Render, se voce quiser manter isso entre reinicios/deploys, use disco persistente ou mova depois para banco externo.
