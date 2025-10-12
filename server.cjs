const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;
const distPath = path.join(__dirname, 'dist');

// Static assets with cache
app.use(express.static(distPath, { maxAge: '1h', etag: true }));

// Simple health check for readiness probes
app.get('/health', (_req, res) => res.status(200).send('OK'));

// SPA fallback
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
