import { runAnalysis } from './src/services/analysis-orchestrator.js';

const testProfile = {
  username: 'test',
  followersCount: 50000,
  isVerified: false,
  bio: 'Fitness coach helping people transform their lives',
  engagement: { engagementRate: 3.5, avgLikes: 1500, avgComments: 50, postsAnalyzed: 10 }
};

const testBusiness = {
  id: 'test-business',
  name: 'FitTech Solutions',
  industry: 'fitness',
  target_audience: 'health-conscious millennials'
};

// Test orchestration flow
console.log('Testing orchestration...');
const result = await runAnalysis(testProfile, testBusiness, 'light', env, 'test-req');
console.log('Result:', result.verdict, result.totalCost);
