import assert from "node:assert/strict"
import { test } from "node:test"

import { ageDays, ago, compact, dayBucket, duration, multiplier } from "../src/lib/format.ts"

test("compact counts and scores match the shipped display", () => {
  assert.equal(compact(null), "–")
  assert.equal(compact(1_500), "1.5K")
  assert.equal(compact(10_000), "10K")
  assert.equal(multiplier(2.25), "2.3×")
  assert.equal(multiplier(10.6), "11×")
})

test("relative dates and buckets distinguish current and older videos", () => {
  const hoursAgo = (hours) => new Date(Date.now() - hours * 3_600_000).toISOString()
  assert.equal(ago(null), "never")
  assert.equal(ago(hoursAgo(0.01)), "just now")
  assert.equal(ago(hoursAgo(48)), "2 days ago")
  assert.equal(dayBucket(hoursAgo(1)), "Today")
  assert.equal(dayBucket(hoursAgo(36)), "Yesterday")
  assert.equal(dayBucket(hoursAgo(72)), "This week")
  assert.equal(dayBucket(hoursAgo(240)), "This month")
  assert.equal(dayBucket(hoursAgo(900)), "Earlier")
  assert.ok(ageDays(hoursAgo(72)) >= 3)
})

test("duration renders minutes and hours", () => {
  assert.equal(duration(null), "")
  assert.equal(duration(65), "1:05")
  assert.equal(duration(3_665), "1:01:05")
})
