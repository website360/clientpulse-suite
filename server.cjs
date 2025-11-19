const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;
const distPath = path.join(__dirname, 'dist');

// Static assets with reduced cache
app.use(express.static(distPath, { maxAge: '5m', etag: true }));

// No cache for index.html
app.use((req, res, next) => {
  if (req.path === '/index.html' || req.path === '/') {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
});

// Simple health check for readiness probes
app.get('/health', (_req, res) => res.status(200).send('OK'));

// SPA fallback only for non-file requests
app.use((req, res, next) => {
  const accept = req.headers.accept || '';
  const hasExtension = path.extname(req.path) !== '';
  if (hasExtension || !accept.includes('text/html')) return next();
  res.sendFile(path.join(distPath, 'index.html'));
});

// 404 for other unmatched requests
app.use((req, res) => res.status(404).send('Not Found'));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
