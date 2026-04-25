const express = require('express');
const path = require('path');
const { createDashboardServer } = require('./dashboard-backend');

const app = express();
const PORT = Number(process.env.PORT || 3000);

createDashboardServer(app, {
  rootDir: __dirname,
  panelFile: path.join(__dirname, 'dashboard.html'),
});

app.listen(PORT, () => {
  console.log(`[DASHBOARD] Rodando na porta ${PORT}`);
});
