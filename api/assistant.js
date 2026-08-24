const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ALLOWED_ORIGINS = new Set([
  'https://symmetrix.dev',
  'https://www.symmetrix.dev',
  'http://localhost:3000',
  'http://localhost:5173'
]);

module.exports = async (req, res) => {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!OPENAI_API_KEY) return res.status(503).json({ error: 'AI assistant is not configured' });

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!message || message.length > 2000) {
    return res.status(400).json({ error: 'Message must be between 1 and 2000 characters' });
  }

  const history = Array.isArray(body.history)
    ? body.history
      .filter(item => item && ['user', 'assistant'].includes(item.role) && typeof item.content === 'string')
      .slice(-8)
      .map(item => ({ role: item.role, content: item.content.slice(0, 2000) }))
    : [];

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
        instructions: 'You are Symmetrix SOC Copilot. Give concise, defensive cybersecurity guidance for authorized systems. Help with triage, remediation, secure configuration, and responsible disclosure. Do not provide malware, credential theft, evasion, persistence, or instructions to exploit real targets. Ask for authorization when context is unclear. If the user has not provided enough context, ask one focused follow-up question before giving a detailed plan. Use short headings and practical next steps.',
        input: [...history, { role: 'user', content: message }],
        max_output_tokens: 500
      })
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('AI provider error:', response.status, data.error?.message || 'unknown error');
      return res.status(502).json({ error: 'The AI assistant is temporarily unavailable' });
    }

    const answer = typeof data.output_text === 'string' ? data.output_text.trim() : '';
    if (!answer) return res.status(502).json({ error: 'The AI assistant returned no answer' });
    return res.status(200).json({ answer });
  } catch (error) {
    console.error('AI assistant request failed:', error.message);
    return res.status(502).json({ error: 'The AI assistant is temporarily unavailable' });
  }
};
