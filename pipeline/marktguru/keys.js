// pipeline/marktguru/keys.js
export function extractKeys(html) {
  const blocks = [...html.matchAll(/<script type="application\/json">([\s\S]*?)<\/script>/g)]
  for (const [, json] of blocks) {
    let parsed
    try { parsed = JSON.parse(json) } catch { continue }
    const cfg = parsed?.config
    if (cfg?.apiKey && cfg?.clientKey) {
      return {
        apiKey: cfg.apiKey,
        clientKey: cfg.clientKey,
        host: cfg.apiHostAddress ?? 'api.marktguru.de',
      }
    }
  }
  throw new Error('marktguru: config block with apiKey/clientKey not found')
}
