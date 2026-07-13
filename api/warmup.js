const WF_ID = process.env.STEELENGINE_WORKFLOW_ID || 'dbb28203-b201-4f61-a3bc-57d55a40f7b6';
const STEELENGINE_BASE_URL = (process.env.STEELENGINE_BASE_URL || 'https://dev.steelengine.com').replace(/\/+$/, '');

export default async function handler(req, res) {
  if (!process.env.STEELENGINE_API_KEY) {
    res.status(500).json({ error: 'Missing STEELENGINE_API_KEY on the server' });
    return;
  }

  try {
    const response = await fetch(`${STEELENGINE_BASE_URL}/api/workflows/${WF_ID}/execute`, {
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
