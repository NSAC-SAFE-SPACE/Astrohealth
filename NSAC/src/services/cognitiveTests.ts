export interface ReactionTestSummary {
  medianMs: number;
  lapses: number;
  trialCount: number;
}

export interface OrientationTestSummary {
  accuracy: number;
  correctCount: number;
  meanResponseMs: number;
  trialCount: number;
}

export function summarizeReactionTimes(timesMs: number[]): ReactionTestSummary {
  const validTimes = timesMs.filter((time) => Number.isFinite(time) && time >= 0).sort((a, b) => a - b);
  if (validTimes.length === 0) {
    throw new RangeError('At least one valid reaction time is required.');
  }

  const middle = Math.floor(validTimes.length / 2);
  const median =
    validTimes.length % 2 === 0
      ? (validTimes[middle - 1] + validTimes[middle]) / 2
      : validTimes[middle];

  return {
    medianMs: Math.round(median),
    lapses: validTimes.filter((time) => time >= 500).length,
    trialCount: validTimes.length
  };
}

export function summarizeOrientationResponses(
  correctAnswers: boolean[],
  responseTimesMs: number[]
): OrientationTestSummary {
  if (correctAnswers.length === 0 || correctAnswers.length !== responseTimesMs.length) {
    throw new RangeError('Orientation answers and response times must have the same non-zero length.');
  }

  const validTimes = responseTimesMs.filter((time) => Number.isFinite(time) && time >= 0);
  if (validTimes.length !== correctAnswers.length) {
    throw new RangeError('Every orientation response must have a valid response time.');
  }

  const correctCount = correctAnswers.filter(Boolean).length;
  return {
    accuracy: Math.round((correctCount / correctAnswers.length) * 1000) / 10,
    correctCount,
    meanResponseMs: Math.round(validTimes.reduce((sum, time) => sum + time, 0) / validTimes.length),
    trialCount: correctAnswers.length
  };
}
