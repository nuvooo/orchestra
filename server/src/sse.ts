import type { FastifyReply } from 'fastify'

// Minimal per-ticket Server-Sent-Events bus. Clients subscribe to a ticket's
// stream and receive activity steps + status changes as the agent works.
const channels = new Map<string, Set<FastifyReply>>()

export function subscribe(ticketId: string, reply: FastifyReply) {
  let set = channels.get(ticketId)
  if (!set) { set = new Set(); channels.set(ticketId, set) }
  set.add(reply)
  reply.raw.on('close', () => {
    set!.delete(reply)
    if (set!.size === 0) channels.delete(ticketId)
  })
}

export function broadcast(ticketId: string, event: string, data: unknown) {
  const set = channels.get(ticketId)
  if (!set) return
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
  for (const reply of set) {
    try { reply.raw.write(payload) } catch { /* client gone */ }
  }
}
