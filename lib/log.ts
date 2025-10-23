export const log = {
  upload: (...a: any[]) => console.log('[UPLOAD]', ...a),
  proc:   (...a: any[]) => console.log('[PROCESSOR]', ...a),
  pine:   (...a: any[]) => console.log('[PINECONE]', ...a),
  chat:   (...a: any[]) => console.log('[CHAT]', ...a),
  warn:   (...a: any[]) => console.warn('[WARN]', ...a),
  err:    (...a: any[]) => console.error('[ERROR]', ...a),
}
