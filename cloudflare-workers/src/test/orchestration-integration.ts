import { runAnalysis } from '../services/analysis-orchestrator.js';
import { createMicroSnapshot } from '../services/micro-snapshot.js';

interface TestResult {
  phase: string;
  success: boolean;
  cost: number;
  duration_ms: number;
  error?: string;
}

export async function runIntegrationTests(env: any): Promise<TestResult[]> {
  const results: TestResult[] = [];
  
  // Test data
  const testProfile = {
    username: 'fitness_coach_test',
    displayName: 'Fitness Coach',
    followersCount: 45000,
    followingCount: 1200,
    postsCount: 850,
    isVerified: false,
    isPrivate: false,
    profilePicUrl: 'https://example.com/pic.jpg',
    bio: 'Certified personal trainer helping busy professionals get fit 💪 DM for custom workout plans',
    externalUrl: 'https://fitcoach.com',
    isBusinessAccount: true,
    latestPosts: [
      {
        id: '1',
        shortCode: 'abc123',
        caption: '5 morning exercises that will transform your day! Save this post 📌 #fitness #morningworkout #health',
        likesCount: 1200,
        commentsCount: 45,
        timestamp: '2025-01-10T08:00:00Z',
        url: 'https://instagram.com/p/abc123',
        type: 'photo',
        hashtags: ['#fitness', '#morningworkout', '#health'],
        mentions: [],
        isVideo: false
      }
    ],
    engagement: {
      avgLikes: 950,
      avgComments: 35,
      engagementRate: 2.2,
      totalEngagement: 985,
      postsAnalyzed: 12
    },
    scraperUsed: 'deep_test',
    dataQuality: 'high' as const
  };

  const testBusiness = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    user_id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'FitTech Solutions',
    industry: 'fitness technology',
    target_audience: 'health-conscious professionals aged 25-45',
    value_proposition: 'AI-powered fitness apps that adapt to busy schedules',
    target_problems: 'lack of time for gym, inconsistent workout routines',
    business_name: 'FitTech Solutions'
  };

  // TEST 1: Business Context Generation
  const contextStart = Date.now();
  try {
    const context = await ensureBusinessContext(testBusiness, env, 'test-context');
    const contextDuration = Date.now() - contextStart;
    
    results.push({
      phase: 'business_context',
      success: !!context.business_one_liner,
      cost: 0.001, // Estimated
      duration_ms: contextDuration
    });
  } catch (error: any) {
    results.push({
      phase: 'business_context',
      success: false,
      cost: 0,
      duration_ms: Date.now() - contextStart,
      error: error.message
    });
  }

  // TEST 2: Light Analysis
  const lightStart = Date.now();
  try {
    const lightResult = await runAnalysis(testProfile, testBusiness, 'light', env, 'test-light');
    results.push({
      phase: 'light_analysis',
      success: lightResult.verdict === 'success',
      cost: lightResult.totalCost.actual_cost,
      duration_ms: lightResult.performance.total_ms,
      error: lightResult.verdict === 'error' ? lightResult.result.error : undefined
    });
  } catch (error: any) {
    results.push({
      phase: 'light_analysis',
      success: false,
      cost: 0,
      duration_ms: Date.now() - lightStart,
      error: error.message
    });
  }

  // TEST 3: Deep Analysis  
  const deepStart = Date.now();
  try {
    const deepResult = await runAnalysis(testProfile, testBusiness, 'deep', env, 'test-deep');
    results.push({
      phase: 'deep_analysis',
      success: deepResult.verdict === 'success',
      cost: deepResult.totalCost.actual_cost,
      duration_ms: deepResult.performance.total_ms,
      error: deepResult.verdict === 'error' ? deepResult.result.error : undefined
    });
  } catch (error: any) {
    results.push({
      phase: 'deep_analysis',
      success: false,
      cost: 0,
      duration_ms: Date.now() - deepStart,
      error: error.message
    });
  }

  // TEST 4: Micro Snapshot Generation
  const snapshotStart = Date.now();
  try {
    const snapshot = createMicroSnapshot(testProfile);
    const snapshotDuration = Date.now() - snapshotStart;
    
    const isValid = snapshot.username === testProfile.username &&
                   snapshot.followers === testProfile.followersCount &&
                   snapshot.engagement_signals?.avg_likes === testProfile.engagement.avgLikes;
    
    results.push({
      phase: 'micro_snapshot',
      success: isValid,
      cost: 0,
      duration_ms: snapshotDuration
    });
  } catch (error: any) {
    results.push({
      phase: 'micro_snapshot',
      success: false,
      cost: 0,
      duration_ms: Date.now() - snapshotStart,
      error: error.message
    });
  }

  return results;
}
