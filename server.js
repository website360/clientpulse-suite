import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// Handle all routes by serving index.html (for SPA)
// SPA fallback only for non-file requests
app.get('*', (req, res, next) => {
  const accept = req.headers.accept || '';
  const hasExtension = path.extname(req.path) !== '';
  if (hasExtension || !accept.includes('text/html')) return next();
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// 404 for other unmatched requests (prevents HTML for JS)
app.use((req, res) => res.status(404).send('Not Found'));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
