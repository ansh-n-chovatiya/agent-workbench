import { test, expect } from 'claude-code/testing'

import { decide } from './route'

const spawn = (over: Record<string, string | undefined> = {}) => ({
  subagentType: 'general-purpose', description: 'Find the config files', parentModel: 'claude-opus-5-5', ...over,
})

test('off by default: nothing changes', async () => {
  expect(decide(spawn(), false)).toEqual({ why: 'router off' })
})

test('an explicit model on the call wins', async () => {
  expect(decide(spawn({ model: 'opus' }), true).model).toBeUndefined()
})

test('ctx agents are left to the ledger', async () => {
  expect(decide(spawn({ subagentType: 'ctx:unit-runner', description: 'Build unit 01' }), true).model).toBeUndefined()
})

test('keywords pick a family, dearest first', async () => {
  expect(decide(spawn({ description: 'Find the config files' }), true).model).toBe('haiku')
  expect(decide(spawn({ description: 'Implement the report flag' }), true).model).toBe('sonnet')
  expect(decide(spawn({ description: 'Find the root cause of the race' }), true).model).toBeUndefined() // opus: not cheaper than opus
  expect(decide(spawn({ subagentType: 'Explore', description: 'the plugin layout' }), true).model).toBe('haiku')
})

test('never moves a spawn to a dearer model than the main one', async () => {
  expect(decide(spawn({ parentModel: 'claude-sonnet-5-5', description: 'Debug the failing hook' }), true).model).toBeUndefined()
  expect(decide(spawn({ parentModel: 'claude-haiku-5-5', description: 'Implement the flag' }), true).model).toBeUndefined()
  expect(decide(spawn({ parentModel: 'claude-sonnet-5-5', description: 'Find the config files' }), true).model).toBe('haiku')
})

test('no keyword and unknown main model leave the spawn alone', async () => {
  expect(decide(spawn({ description: 'Think about it' }), true).why).toBe('no keyword match')
  expect(decide(spawn({ parentModel: 'mystery-1' }), true).why).toMatch(/not recognised/)
})
