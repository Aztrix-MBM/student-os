import { TopicItem } from '../types';

/**
 * Retention calculation based on Ebbinghaus forgetting curve:
 * - When topic is Strong, retention is 100% for the first 7 days.
 * - When topic is Okay, retention is 100% for the first 3 days.
 * - For Weak topics, retention decays immediately.
 */
export function calculateRetention(
  daysSinceReview: number,
  stability: number,
  level: TopicItem['level'] = 'strong'
): number {
  if (daysSinceReview <= 0 || level === 'strong') return 1.0;

  if (level === 'okay') {
    if (daysSinceReview <= 7) return 1.0;
    const effectiveStability = Math.max(7, stability * 1.5);
    return Math.max(0.7, Math.exp(-(daysSinceReview - 7) / effectiveStability));
  }

  // Weak topics decay faster according to Ebbinghaus curve
  return Math.max(0.4, Math.exp(-daysSinceReview / Math.max(2.0, stability)));
}

/**
 * Topic mastery weight:
 * strong = 1.0 (100% mastery), okay = 0.70 (70% mastery), weak = 0.40 (40% mastery), unrated = 0
 */
export function getMasteryScore(level: TopicItem['level']): number {
  switch (level) {
    case 'strong':
      return 1.0;
    case 'okay':
      return 0.70;
    case 'weak':
      return 0.40;
    default:
      return 0.0;
  }
}

/**
 * Pure function to calculate Exam Readiness % and Coverage %
 * readiness = Σ(topic_weight * mastery * retention) / Σ(topic_weight)
 * coverage  = topics_with_review / total_topics
 */
export function calculateExamReadiness(topics: TopicItem[]): {
  readinessPct: number;
  coveragePct: number;
  weakTopics: string[];
  strongTopics: string[];
  strongCount: number;
  weakCount: number;
} {
  if (!topics || topics.length === 0) {
    return {
      readinessPct: 0,
      coveragePct: 0,
      weakTopics: [],
      strongTopics: [],
      strongCount: 0,
      weakCount: 0,
    };
  }

  let totalWeight = 0;
  let weightedScore = 0;
  let reviewedCount = 0;
  const weakTopics: string[] = [];
  const strongTopics: string[] = [];

  for (const topic of topics) {
    const weight = topic.importance || 1.0;
    totalWeight += weight;

    if (topic.level !== 'unrated') {
      reviewedCount++;
    }

    const mastery = getMasteryScore(topic.level);
    const retention = calculateRetention(topic.lastReviewedDaysAgo, topic.stabilityDays, topic.level);
    const topicScore = weight * mastery * retention;

    weightedScore += topicScore;

    if (topic.level === 'weak' || (topic.level === 'okay' && retention < 0.6)) {
      weakTopics.push(topic.name);
    } else if (topic.level === 'strong') {
      strongTopics.push(topic.name);
    }
  }

  const readinessPct = totalWeight > 0 ? Math.round((weightedScore / totalWeight) * 100) : 0;
  const coveragePct = Math.round((reviewedCount / topics.length) * 100);

  return {
    readinessPct,
    coveragePct,
    weakTopics: weakTopics.slice(0, 4),
    strongTopics: strongTopics.slice(0, 4),
    strongCount: strongTopics.length,
    weakCount: weakTopics.length,
  };
}
