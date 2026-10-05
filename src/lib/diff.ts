export interface DiffPart {
  type: 'equal' | 'added' | 'removed';
  text: string;
}

export { wordDiff } from './diff/word-diff';
