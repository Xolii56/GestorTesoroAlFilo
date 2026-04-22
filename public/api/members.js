export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Cache-Control', 's-maxage=3600');

  const apiKey = process.env.SC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    const response = await fetch(
      `https://api.starcitizen-api.com/${apiKey}/v1/live/organization/ALFILO`
    );
    const data = await response.json();

    if (!data.success || !data.data) {
      return res.status(502).json({ error: 'RSI API error' });
    }

    return res.status(200).json({
      members: data.data.members,
      name: data.data.name,
      sid: data.data.sid,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Fetch failed', detail: err.message });
  }
}
