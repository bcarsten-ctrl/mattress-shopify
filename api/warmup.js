const WF_ID = 'f920956c-aaf1-485b-ac18-0095244e4e47';

export default async function handler(req, res) {
  if (!process.env.STEELENGINE_API_KEY) {
    res.status(500).json({ error: 'Missing STEELENGINE_API_KEY on the server' });
    return;
  }

  try {
    const response = await fetch(`https://steelengine.com/api/workflows/${WF_ID}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.STEELENGINE_API_KEY,
        'X-Execution-Mode': 'async',
      },
      body: JSON.stringify({ name: `__mattress_warmup_no_match_${Date.now()}` }),
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : null;
    res.status(response.status).json({
      ok: response.ok,
      workflowId: WF_ID,
      async: data?.async || false,
      jobId: data?.jobId || data?.executionId || null,
    });
  } catch (e) {
    res.status(500).json({ error: 'Warmup error: ' + e.message });
  }
}
