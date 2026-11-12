// heartbeat.yml `rounds` input clamp: runs the workflow's own 3 clamp lines in bash. Usage: node tests/heartbeat-rounds.mjs
import fs from 'node:fs'; import assert from 'node:assert/strict'; import { execFileSync } from 'node:child_process';
const y = fs.readFileSync('.github/workflows/heartbeat.yml', 'utf8').split('\n'), i = y.findIndex((l) => l.includes('# rounds clamp'));
assert.ok(i > 0, 'clamp block found'); const code = y.slice(i + 1, i + 4).map((l) => l.trim()).join('\n');
const run = (v) => execFileSync('bash', ['-c', `set -u; ROUNDS="$1"\n${code}\necho "$ROUNDS"`, 'x', v]).toString().trim();
for (const [v, want] of [['1', '1'], ['3', '3'], ['5', '5'], ['0', '1'], ['00', '1'], ['6', '5'], ['9', '5'], ['10', '5'], ['05', '5'], ['03', '3'], ['99999999999999999999', '5'],
  ['', '5'], ['abc', '5'], ['-1', '1'], ['-7', '1'], ['-', '5'], ['-1x', '5'], ['--1', '5'], ['2.5', '5'], [' 3', '5'], ['3; echo hi', '5'], ['$(id)', '5']]) assert.equal(run(v), want, `rounds ${JSON.stringify(v)} -> ${want}`);
console.log('PASS heartbeat-rounds (22 cases)');
