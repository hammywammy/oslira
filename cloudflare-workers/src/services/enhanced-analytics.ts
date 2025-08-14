export interface EnhancedProfileIntelligence {
  dataRichness: number;
  analysisValue: number;
  complexityLevel: 'basic' | 'moderate' | 'advanced' | 'executive';
  recommendedModel: string;
  speedTarget: number;
  promptStrategy: string;
  confidenceFactors: {
    dataQuality: number;
    profileCompleteness: number;
    engagementReliability: number;
    temporalConsistency: number;
  };
}

export function calculateEnhancedProfileIntelligence(
  profile: any, 
  business: any
): EnhancedProfileIntelligence {
  let dataRichness = 0;
  let analysisValue = 0;
  
  // Enhanced data richness calculation
  const profileFields = [
    profile.bio, profile.followersCount, profile.followingCount, 
    profile.postsCount, profile.externalUrl, profile.displayName
  ];
  
  const completedFields = profileFields.filter(field => field && field !== '').length;
  dataRichness += (completedFields / profileFields.length) * 40;
  
  // Engagement data quality
  if (profile.latestPosts && profile.latestPosts.length > 0) {
    dataRichness += 30;
    if (profile.latestPosts.length >= 5) dataRichness += 10;
    if (profile.latestPosts.length >= 10) dataRichness += 10;
    
    // Post content quality
    const avgCaptionLength = profile.latestPosts.reduce((sum, post) => 
      sum + (post.caption?.length || 0), 0) / profile.latestPosts.length;
    if (avgCaptionLength > 100) dataRichness += 10;
  }
  
  // Verification and business account status
  if (profile.isVerified) dataRichness += 15;
  if (profile.isBusinessAccount) dataRichness += 10;
  
  // Enhanced analysis value calculation
  if (business.industry && profile.bio) {
    const industryKeywords = business.industry.toLowerCase().split(' ');
    const bioText = profile.bio.toLowerCase();
    const keywordMatches = industryKeywords.filter(keyword => 
      bioText.includes(keyword)).length;
    analysisValue += keywordMatches * 15;
  }
  
  // Follower quality assessment
  const followerCount = profile.followersCount || 0;
  const followingCount = profile.followingCount || 0;
  
  if (followerCount > 0 && followingCount > 0) {
    const ratio = followerCount / followingCount;
    if (ratio > 1) analysisValue += 20; // More followers than following
    if (ratio > 2) analysisValue += 10; // Good ratio
    if (ratio > 5) analysisValue += 10; // Excellent ratio
  }
  
  // Engagement rate estimation
  if (profile.latestPosts?.length > 0) {
    const totalEngagement = profile.latestPosts.reduce((sum, post) => 
      sum + (post.likesCount || 0) + (post.commentsCount || 0), 0);
    const avgEngagement = totalEngagement / profile.latestPosts.length;
    const estimatedRate = followerCount > 0 ? (avgEngagement / followerCount) * 100 : 0;
    
    if (estimatedRate > 1) analysisValue += 20;
    if (estimatedRate > 3) analysisValue += 10;
    if (estimatedRate > 5) analysisValue += 10;
  }
  
  // Confidence factors calculation
  const confidenceFactors = {
    dataQuality: Math.min(100, dataRichness),
    profileCompleteness: (completedFields / profileFields.length) * 100,
    engagementReliability: profile.latestPosts?.length > 0 ? 
      Math.min(100, (profile.latestPosts.length / 10) * 100) : 0,
    temporalConsistency: profile.latestPosts?.length >= 3 ? 85 : 50
  };
  
  // Determine complexity and strategy
  const totalScore = dataRichness + analysisValue;
  let complexityLevel: 'basic' | 'moderate' | 'advanced' | 'executive';
  let promptStrategy: 'screening' | 'standard' | 'strategic' | 'executive';
  let recommendedModel: string;
  
  if (totalScore < 30) {
    complexityLevel = 'basic';
    promptStrategy = 'screening';
    recommendedModel = 'gpt-3.5-turbo';
  } else if (totalScore < 60) {
    complexityLevel = 'moderate';
    promptStrategy = 'standard';
    recommendedModel = 'gpt-4o-mini';
  } else if (totalScore < 90) {
    complexityLevel = 'advanced';
    promptStrategy = 'strategic';
    recommendedModel = 'gpt-4o';
  } else {
    complexityLevel = 'executive';
    promptStrategy = 'executive';
    recommendedModel = 'claude-3-sonnet';
  }
  
  return {
    dataRichness: Math.round(dataRichness),
    analysisValue: Math.round(analysisValue),
    complexityLevel,
    recommendedModel,
    speedTarget: complexityLevel === 'basic' ? 2000 : complexityLevel === 'moderate' ? 3000 : 5000,
    promptStrategy,
    confidenceFactors
  };
}

// Enhanced confidence calculation
export function calculateEnhancedConfidenceLevel(
  result: any,
  intelligence: EnhancedProfileIntelligence,
  profileData: any
): number {
  let confidence = 50; // Base confidence
  
  // Data quality impact (40% weight)
  confidence += (intelligence.confidenceFactors.dataQuality * 0.4);
  
  // Profile completeness impact (20% weight)
  confidence += (intelligence.confidenceFactors.profileCompleteness * 0.2);
  
  // Engagement reliability impact (25% weight)
  confidence += (intelligence.confidenceFactors.engagementReliability * 0.25);
  
  // Temporal consistency impact (15% weight)
  confidence += (intelligence.confidenceFactors.temporalConsistency * 0.15);
  
  // Score consistency check
  const scores = [result.score, result.engagement_score, result.niche_fit].filter(s => s !== undefined);
  if (scores.length >= 2) {
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((acc, score) => acc + Math.pow(score - avgScore, 2), 0) / scores.length;
    
    if (variance < 100) confidence += 15; // Low variance = high confidence
    if (variance > 400) confidence -= 20; // High variance = low confidence
  }
  
  // Real engagement data bonus
  if (profileData.engagement?.postsAnalyzed > 0) {
    confidence += 10;
    if (profileData.engagement.postsAnalyzed >= 5) confidence += 5;
    if (profileData.engagement.postsAnalyzed >= 10) confidence += 5;
  }
  
  // Account verification bonus
  if (profileData.isVerified) confidence += 5;
  if (profileData.isBusinessAccount) confidence += 5;
  
  // Penalty for private accounts
  if (profileData.isPrivate) confidence -= 15;
  
  return Math.max(20, Math.min(95, Math.round(confidence)));
}
