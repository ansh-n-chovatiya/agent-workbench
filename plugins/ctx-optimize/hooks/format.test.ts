import { test, expect } from 'claude-code/testing'

import { clip, kilo, line } from './format'

test('clip keeps labels within 60 characters', async () => {
  expect(clip('x'.repeat(100)).length).toBe(60)
  expect(clip('short')).toBe('short')
})

test('kilo abbreviates token counts', async () => {
  expect([kilo(999), kilo(1500), kilo(2_400_000)]).toEqual(['999', '2k', '2.4M'])
})

test('line shows status, type, model, tokens and label', async () => {
  const text = line({ status: 'running', type: 'ctx:reviewer', label: 'Review unit 01', model: 'opus', tokens: 52000 })
  expect(text.startsWith('running')).toBe(true)
  expect(text.includes('52k')).toBe(true)
  expect(text.endsWith('Review unit 01')).toBe(true)
})

import { paneLines } from './format'

test('paneLines says so plainly when there are no agents', async () => {
  expect(paneLines([], {}, 10)).toEqual([{ text: 'No agents yet in this session.', dim: true }])
})

test('paneLines shows status, type, model, tokens and a label cut to 60 characters, dimming finished agents', async () => {
  const agents = [
    { id: 'a1', description: 'Review unit 01 ' + 'x'.repeat(100), type: 'ctx:reviewer', status: 'running' },
    { id: 'a2', description: 'Build unit 02', type: 'ctx:unit-runner', status: 'completed' },
  ]
  const out = paneLines(agents, { a1: { tokens: 52000, model: 'opus' } }, 10)
  expect(out.length).toBe(2)
  expect(out[0].dim).toBe(false)
  expect(out[0].text.includes('52k') && out[0].text.includes('opus')).toBe(true)
  expect(out[0].text.includes('x'.repeat(61))).toBe(false)
  expect(out[1].dim).toBe(true)
  expect(out[1].text.endsWith('Build unit 02')).toBe(true)
})

test('paneLines keeps only the newest agents that fit', async () => {
  const agents = ['a', 'b', 'c', 'd'].map(id => ({ id, description: id, type: 't', status: 'running' }))
  expect(paneLines(agents, {}, 2).map(l => l.text.trim().slice(-1))).toEqual(['c', 'd'])
  expect(paneLines(agents, {}, 0).length).toBe(1)
})
