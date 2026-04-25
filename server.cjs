const express = require('express');
const path = require('path');
const fs = require('fs');
const { createDashboardServer } = require('./dashboard-backend.cjs');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const rootDir = __dirname;
const distDir = path.join(rootDir, 'dist');
const indexFile = path.join(distDir, 'index.html');

createDashboardServer(app, {
  rootDir,
  panelFile: fs.existsSync(indexFile) ? indexFile : path.join(rootDir, 'public', 'fallback.html'),
});

if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path === '/health') return next();
    res.sendFile(indexFile);
  });
}

app.listen(PORT, () => {
  console.log(`[NEXUS] API rodando em http://localhost:${PORT}`);
});
