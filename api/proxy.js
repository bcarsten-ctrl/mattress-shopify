export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Execution-Mode');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { path } = req.query;
  if (!path) {
    res.status(400).json({ error: 'Missing path parameter' });
    return;
  }

  if (!process.env.STEELENGINE_API_KEY) {
    res.status(500).json({ error: 'Missing STEELENGINE_API_KEY on the server' });
    return;
  }

  const url = `https://steelengine.com/${Array.isArray(path) ? path.join('/') : path}`;

  try {
    const headers = {
      'Content-Type': 'application/json',
      'X-API-Key': process.env.STEELENGINE_API_KEY || '',
    };
    if (req.headers['x-execution-mode']) {
      headers['X-Execution-Mode'] = req.headers['x-execution-mode'];
    }

    const response = await fetch(url, {
      method: req.method,
      headers,
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined,
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : null;
    res.status(response.status).json(data);
  } catch (e) {
    res.status(500).json({ error: 'Proxy error: ' + e.message });
  }
}
