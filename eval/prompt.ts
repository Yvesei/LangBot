import { learnerPrompt, tutorPrompt } from '../src/lib/server/prompts';
import type { EvaluationCase, EvaluationVariant } from './config';

const baseline = `You are a friendly language tutor. Respond to the learner and correct their mistakes.
Return reply, correction (correctedText, issues with category and explanation, exercise with instruction/sentence/answer or null), and topics.
For unchanged text, issues is [] and exercise is null. For errors, give an explanation and one exercise.
Use the target language for the reply and native language for explanations. The last message is JSON; correct learnerMessage.`;

export function getSystemPrompt(item: EvaluationCase, variant: EvaluationVariant) {
  if (variant === 'tutor') {
    return tutorPrompt(item.languageConfig, item.userLevel);
  }
  return `${baseline}\n${learnerPrompt(item.languageConfig, item.userLevel)}`;
}
