require('dotenv').config({ quiet: true });
const { pool } = require('./db');
const { createApp } = require('./app');

const app = createApp({ pool });
const port = Number(process.env.PORT || process.env.API_PORT || 3333);

const server = app.listen(port, '0.0.0.0', (error) => {
  if (error) {
    console.error(error.code === 'EADDRINUSE'
      ? `A porta ${port} já está ocupada. Encerre a execução anterior da API/apresentar com Ctrl+C e tente novamente. Nenhuma porta alternativa será usada.`
      : `Não foi possível abrir a API na porta ${port}. Confira as permissões de rede.`);
    process.exit(1);
    return;
  }
  const actualPort = server.address().port;
  console.log(`API Caloriq disponível em http://localhost:${actualPort}`);
  if (process.send) process.send({ type: 'ready', port: actualPort });
});
