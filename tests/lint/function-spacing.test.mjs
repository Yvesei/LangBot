import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Linter } from 'eslint';
import blankLineBeforeFunction from '../../eslint-function-spacing.mjs';

const linter = new Linter();
const config = [
  {
    plugins: {
      project: { rules: { spacing: blankLineBeforeFunction } },
    },
    rules: { 'project/spacing': 'error' },
  },
];

const missingSpacingCases = [
  ['functions', 'function first() {}\nfunction second() {}'],
  ['exports', 'export function first() {}\nexport function second() {}'],
  ['arrow functions', 'const first = () => {};\nconst second = () => {};'],
  ['class methods', 'class Example { first() {}\nsecond() {} }'],
  ['object methods', 'const example = { first() {},\nsecond() {} };'],
  ['assignments', 'handler.first = () => {};\nhandler.second = () => {};'],
  [
    'useCallback declarations',
    'const first = useCallback(() => {}, []);\nconst second = useCallback(() => {}, []);',
  ],
  ['tests', "test('first', () => {});\ntest('second', () => {});"],
  ['it blocks', "it('first', () => {});\nit('second', () => {});"],
  ['describe blocks', "describe('first', () => {});\ndescribe('second', () => {});"],
  ['lifecycle hooks', 'beforeEach(() => {});\nafterEach(() => {});'],
  ['all-suite hooks', 'beforeAll(() => {});\nafterAll(() => {});'],
  ['each tables', "test('first', () => {});\ntest.each([1])('second', () => {});"],
  ['tagged each tables', "test('first', () => {});\nit.each`value`('second', () => {});"],
  ['only modifier', "test('first', () => {});\ntest.only('second', () => {});"],
  ['skip modifier', "test('first', () => {});\nit.skip('second', () => {});"],
  [
    'function callbacks',
    "test('first', function () {});\ntest('second', function () {});",
  ],
  ['same-line blocks', "test('first', () => {}); test('second', () => {});"],
  ['leading comments', 'function first() {}\n// second function\nfunction second() {}'],
  ['async tests', "test('first', async () => {});\ntest('second', async () => {});"],
];

for (const [name, source] of missingSpacingCases) {
  test(`adds missing spacing between ${name}`, () => {
    const messages = linter.verify(source, config);
    assert.equal(messages.length, 1);
    assert.equal(messages[0].messageId, 'missingBlankLine');

    const result = linter.verifyAndFix(source, config);
    assert.equal(result.fixed, true);
    assert.deepEqual(result.messages, []);
    assert.match(result.output, /\n\n/);
    assert.equal(linter.verifyAndFix(result.output, config).fixed, false);

    if (name === 'leading comments') {
      assert.equal(
        result.output,
        'function first() {}\n\n// second function\nfunction second() {}',
      );
    }
  });
}

const validCases = [
  ['spaced functions', 'function first() {}\n\nfunction second() {}'],
  ['spaced tests', "test('first', () => {});\n\ntest('second', () => {});"],
  ['first declaration', 'function first() {}'],
  ['first method', 'class Example { first() {} }'],
  ['first nested test', "describe('suite', () => { test('first', () => {}); });"],
  ['ordinary callbacks', 'items.forEach(() => {});\nitems.forEach(() => {});'],
];

for (const [name, source] of validCases) {
  test(`preserves ${name}`, () => {
    const result = linter.verifyAndFix(source, config);
    assert.equal(result.fixed, false);
    assert.equal(result.output, source);
    assert.deepEqual(result.messages, []);
  });
}
