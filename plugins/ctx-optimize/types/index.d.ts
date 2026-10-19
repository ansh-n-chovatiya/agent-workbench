export type AgentUse = { tokens: number; model: string }

declare module 'claude-code' {
  interface PluginState {
    'ctx-optimize': { usage: Record<string, AgentUse> }
  }
}
