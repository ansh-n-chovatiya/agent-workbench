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
