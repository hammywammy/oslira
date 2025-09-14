import { logger } from '../utils/logger.js';
import type { PostData, EngagementData, AnalysisType } from '../types/interfaces.js';

export function validateAnalysisResult(result: any): AnalysisResult {
  return {
    score: Math.round(parseFloat(result.score) || 0),
    engagement_score: Math.round(parseFloat(result.engagement_score) || 0),
    niche_fit: Math.round(parseFloat(result.niche_fit) || 0),
    audience_quality: result.audience_quality || 'Unknown',
    engagement_insights: result.engagement_insights || 'No insights available',
    selling_points: Array.isArray(result.selling_points) ? result.selling_points : [],
    reasons: Array.isArray(result.reasons) ? result.reasons : (Array.isArray(result.selling_points) ? result.selling_points : [])
  };
}

export function extractUsername(input: string): string {
  try {
    const cleaned = input.trim().replace(/^@/, '').toLowerCase();
    if (cleaned.includes('instagram.com')) {
      const url = new URL(cleaned);
      const pathSegments = url.pathname.split('/').filter(Boolean);
      return pathSegments[0] || '';
    }
    return cleaned.replace(/[^a-z0-9._]/g, '');
  } catch {
    return '';
  }
}

export function extractHashtags(text: string): string[] {
  if (!text) return [];
  const hashtagRegex = /#[\w\u0590-\u05ff]+/g;
  const matches = text.match(hashtagRegex);
  return matches ? matches.map(tag => tag.toLowerCase()) : [];
}

export function extractMentions(text: string): string[] {
  if (!text) return [];
  const mentionRegex = /@[\w.]+/g;
  const matches = text.match(mentionRegex);
  return matches ? matches.map(mention => mention.toLowerCase()) : [];
}

export function normalizeRequest(body: AnalysisRequest) {
  const errors: string[] = [];
  
  let profile_url = body.profile_url;
  if (!profile_url && body.username) {
    const username = extractUsername(body.username);
    profile_url = username ? `https://instagram.com/${username}` : '';
  }
  
  const analysis_type = body.analysis_type || body.type;
  const business_id = body.business_id;
  const user_id = body.user_id;

  if (!profile_url) errors.push('profile_url or username is required');
if (!analysis_type || !['light', 'deep', 'xray'].includes(analysis_type)) {
  errors.push('analysis_type must be "light", "deep", or "xray"');
}
  if (!business_id) errors.push('business_id is required');
  if (!user_id) errors.push('user_id is required');

  if (errors.length > 0) {
    throw new Error(errors.join(', '));
  }

  return {
    profile_url: profile_url!,
    username: extractUsername(profile_url!),
    analysis_type: analysis_type as AnalysisType,
    business_id,
    user_id
  };
}
export function validateProfileData(responseData: any, analysisType?: string): ProfileData {
  if (!responseData) {
    throw new Error('No response data received from scraper');
  }
  
  if (typeof responseData !== 'object') {
    throw new Error(`Invalid response data type: ${typeof responseData}`);
  }

  // Check for profile not found case
  if (Array.isArray(responseData) && responseData.length > 0) {
    const profile = responseData[0];
    const hasOnlyUsername = Object.keys(profile).length <= 2 && profile.username && !profile.followersCount;
    if (hasOnlyUsername) {
      throw new Error('PROFILE_NOT_FOUND');
    }
  } else if (!Array.isArray(responseData)) {
    const hasOnlyUsername = Object.keys(responseData).length <= 2 && responseData.username && !responseData.followersCount;
    if (hasOnlyUsername) {
      throw new Error('PROFILE_NOT_FOUND');
    }
  }

  try {
    logger('info', 'Starting CORRECTED profile data validation for nested posts structure', { 
      analysisType, 
      isArray: Array.isArray(responseData),
      length: Array.isArray(responseData) ? responseData.length : 'not-array',
      dataType: typeof responseData
    });

    if (analysisType === 'deep') {
      let profileItem;
      let posts = [];

      // Handle different response structures
      if (Array.isArray(responseData)) {
        // Find profile item in array
        profileItem = responseData.find(item => 
          item.username || item.ownerUsername || 
          (item.followersCount !== undefined && item.postsCount !== undefined) ||
          (item.latestPosts !== undefined)
        );
        
        // Also check for posts as separate array items (fallback)
        const separatePosts = responseData.filter(item => 
          item.shortCode && (item.likesCount !== undefined || item.likes !== undefined)
        );
        
        if (separatePosts.length > 0) {
          posts = separatePosts;
          logger('info', 'Found posts as separate array items', { postsCount: posts.length });
        }
      } else {
        // Single object response
        profileItem = responseData;
      }

      if (!profileItem) {
        throw new Error('No profile data found in scraper response');
      }

      // ✅ CRITICAL FIX: Check for nested posts in latestPosts field
      if (profileItem.latestPosts && Array.isArray(profileItem.latestPosts) && profileItem.latestPosts.length > 0) {
        posts = profileItem.latestPosts;
        logger('info', 'Found posts in nested latestPosts field', { 
          nestedPostsCount: posts.length,
          samplePost: posts[0] ? {
            keys: Object.keys(posts[0]),
            shortCode: posts[0].shortCode || posts[0].code,
            likes: posts[0].likesCount || posts[0].likes,
            comments: posts[0].commentsCount || posts[0].comments
          } : 'no-sample'
        });
      }

      logger('info', 'Profile and posts detection completed', {
        profileFound: !!profileItem,
        postsSource: posts.length > 0 ? (profileItem.latestPosts ? 'nested_latestPosts' : 'separate_array_items') : 'none',
        postsCount: posts.length,
        profilePostsCount: profileItem.postsCount,
        latestPostsLength: profileItem.latestPosts?.length || 0
      });

      let engagement: EngagementData | undefined;
      if (posts.length > 0) {
        logger('info', 'Starting MANUAL ENGAGEMENT CALCULATION with nested posts data');
        
        // Enhanced post validation with multiple field name support
        const validPosts = posts.filter(post => {
          const likes = parseInt(String(
            post.likesCount || post.likes || post.like_count || 
            post.likeCount || post.likescount || 0
          )) || 0;
          
          const comments = parseInt(String(
            post.commentsCount || post.comments || post.comment_count || 
            post.commentCount || post.commentscount || post.commentCounts || 0
          )) || 0;
          
          const isValid = likes > 0 || comments > 0;
          
          if (!isValid) {
            logger('warn', 'Post filtered out - no engagement data', {
              shortCode: post.shortCode || post.code || post.id,
              availableFields: Object.keys(post),
              rawLikesFields: {
                likesCount: post.likesCount,
                likes: post.likes,
                like_count: post.like_count
              },
              rawCommentsFields: {
                commentsCount: post.commentsCount,
                comments: post.comments,
                comment_count: post.comment_count
              },
              parsedLikes: likes,
              parsedComments: comments
            });
          }
          
          return isValid;
        });

        logger('info', 'Manual calculation - Step 1: Filter valid posts from nested data', {
          totalPosts: posts.length,
          validPosts: validPosts.length,
          filteredOut: posts.length - validPosts.length,
          validPostsSample: validPosts.slice(0, 3).map(post => ({
            shortCode: post.shortCode || post.code || post.id,
            likes: parseInt(String(post.likesCount || post.likes || post.like_count || 0)) || 0,
            comments: parseInt(String(post.commentsCount || post.comments || post.comment_count || 0)) || 0,
            caption: (post.caption || '').substring(0, 50)
          }))
        });

        if (validPosts.length > 0) {
          // Calculate totals from valid posts
          let totalLikes = 0;
          let totalComments = 0;

          for (const post of validPosts) {
            const likes = parseInt(String(
              post.likesCount || post.likes || post.like_count || 
              post.likeCount || post.likescount || 0
            )) || 0;
            
            const comments = parseInt(String(
              post.commentsCount || post.comments || post.comment_count || 
              post.commentCount || post.commentscount || post.commentCounts || 0
            )) || 0;
            
            totalLikes += likes;
            totalComments += comments;
          }

          logger('info', 'Manual calculation - Step 2: Calculate totals from nested posts', {
            totalLikes,
            totalComments,
            validPostsCount: validPosts.length,
            averageLikesCalc: `${totalLikes} / ${validPosts.length} = ${Math.round(totalLikes / validPosts.length)}`,
            averageCommentsCalc: `${totalComments} / ${validPosts.length} = ${Math.round(totalComments / validPosts.length)}`
          });

          // Calculate averages
          const avgLikes = validPosts.length > 0 ? Math.round(totalLikes / validPosts.length) : 0;
          const avgComments = validPosts.length > 0 ? Math.round(totalComments / validPosts.length) : 0;

          // Calculate engagement rate
          const totalEngagement = avgLikes + avgComments;
          const followers = parseInt(String(
            profileItem.followersCount || profileItem.followers || 
            profileItem.follower_count || profileItem.followerscount || 0
          )) || 0;
          
          const engagementRate = followers > 0 ? 
            Math.round((totalEngagement / followers) * 10000) / 100 : 0;

          logger('info', 'Manual calculation - Steps 3-4: Calculate averages and engagement rate', {
            avgLikes,
            avgComments,
            totalEngagement,
            followers,
            followersSource: profileItem.followersCount ? 'followersCount' : profileItem.followers ? 'followers' : 'other',
            engagementRate,
            engagementCalc: `(${totalEngagement} / ${followers}) * 100 = ${engagementRate}%`
          });

          // Create engagement object
          if (avgLikes > 0 || avgComments > 0) {
            engagement = {
              avgLikes,
              avgComments,
              engagementRate,
              totalEngagement,
              postsAnalyzed: validPosts.length
            };

            logger('info', '✅ MANUAL ENGAGEMENT CALCULATION SUCCESSFUL with nested posts', {
              postsAnalyzed: engagement.postsAnalyzed,
              avgLikes: engagement.avgLikes,
              avgComments: engagement.avgComments,
              engagementRate: engagement.engagementRate,
              totalEngagement: engagement.totalEngagement,
              dataSource: 'nested_latestPosts_field',
              calculationMethod: 'manual_from_individual_posts'
            });
          } else {
            logger('error', '❌ ENGAGEMENT CALCULATION FAILED - All calculated values are zero', {
              avgLikes,
              avgComments,
              totalLikes,
              totalComments,
              validPostsCount: validPosts.length,
              followers,
              debugInfo: 'Check if posts have valid engagement data'
            });
          }
        } else {
          logger('error', '❌ No valid posts with engagement found in nested data', {
            totalPostsInLatestPosts: posts.length,
            samplePostStructures: posts.slice(0, 2).map(post => ({
              allKeys: Object.keys(post),
              shortCode: post.shortCode || post.code,
              possibleLikesValues: {
                likesCount: post.likesCount,
                likes: post.likes,
                like_count: post.like_count
              },
              possibleCommentsValues: {
                commentsCount: post.commentsCount,
                comments: post.comments,
                comment_count: post.comment_count
              }
            }))
          });
        }
      } else {
        logger('error', '❌ No posts found in nested latestPosts field', {
          profilePostsCount: profileItem.postsCount,
          latestPostsExists: !!profileItem.latestPosts,
          latestPostsType: Array.isArray(profileItem.latestPosts) ? 'array' : typeof profileItem.latestPosts,
          latestPostsLength: profileItem.latestPosts?.length || 0,
          profileKeys: Object.keys(profileItem).slice(0, 20)
        });
      }

      // Process latestPosts for return (regardless of engagement calculation success)
      const latestPosts: PostData[] = posts.slice(0, 12).map(post => {
        const caption = post.caption || post.edge_media_to_caption?.edges?.[0]?.node?.text || post.title || '';
        const hashtags = extractHashtags(caption);
        const mentions = extractMentions(caption);

        return {
          id: post.id || post.shortCode || post.code || post.pk || '',
          shortCode: post.shortCode || post.code || post.pk || '',
          caption: caption,
          likesCount: parseInt(String(post.likesCount || post.likes || post.like_count || 0)) || 0,
          commentsCount: parseInt(String(post.commentsCount || post.comments || post.comment_count || 0)) || 0,
          timestamp: post.timestamp || post.taken_at || post.created_time || new Date().toISOString(),
          url: post.url || `https://instagram.com/p/${post.shortCode || post.code}/`,
          type: post.type || post.__typename || (post.isVideo ? 'video' : 'photo'),
          hashtags,
          mentions,
          viewCount: parseInt(String(post.viewCount || post.views || post.video_view_count || 0)) || undefined,
          isVideo: Boolean(post.isVideo || post.type === 'video' || post.__typename === 'GraphVideo')
        };
      });

      // Build final result
      const result = {
        username: (profileItem.username || profileItem.ownerUsername || '').toLowerCase(),
        displayName: profileItem.fullName || profileItem.displayName || profileItem.full_name || '',
        bio: profileItem.biography || profileItem.bio || '',
        followersCount: parseInt(String(profileItem.followersCount || profileItem.followers || 0)) || 0,
        followingCount: parseInt(String(profileItem.followingCount || profileItem.following || 0)) || 0,
        postsCount: parseInt(String(profileItem.postsCount || profileItem.posts || latestPosts.length)) || 0,
        isVerified: Boolean(profileItem.verified || profileItem.isVerified || profileItem.is_verified),
        isPrivate: Boolean(profileItem.private || profileItem.isPrivate || profileItem.is_private),
        profilePicUrl: profileItem.profilePicUrl || profileItem.profilePicture || profileItem.profile_pic_url || '',
        externalUrl: profileItem.externalUrl || profileItem.website || profileItem.external_url || '',
        isBusinessAccount: Boolean(profileItem.isBusinessAccount || profileItem.is_business_account),
        latestPosts,
        engagement
      };

      logger('info', '✅ Profile validation completed with nested posts support', {
        username: result.username,
        followers: result.followersCount,
        postsFound: result.latestPosts.length,
        hasRealEngagement: !!result.engagement,
        engagementSummary: result.engagement ? {
          avgLikes: result.engagement.avgLikes,
          avgComments: result.engagement.avgComments,
          engagementRate: result.engagement.engagementRate,
          postsAnalyzed: result.engagement.postsAnalyzed
        } : 'NO_ENGAGEMENT_DATA'
      });

      return result;

    } else {
      // Light analysis remains the same
      const profile = Array.isArray(responseData) ? responseData[0] : responseData;
      
      if (!profile || !profile.username) {
        throw new Error('Invalid profile data received');
      }

      return {
        username: profile.username,
        displayName: profile.fullName || profile.displayName || '',
        bio: profile.biography || profile.bio || '',
        followersCount: parseInt(profile.followersCount?.toString() || '0') || 0,
        followingCount: parseInt(profile.followingCount?.toString() || '0') || 0,
        postsCount: parseInt(profile.postsCount?.toString() || '0') || 0,
        isVerified: Boolean(profile.verified || profile.isVerified),
        isPrivate: Boolean(profile.private || profile.isPrivate),
        profilePicUrl: profile.profilePicUrl || profile.profilePicture || '',
        externalUrl: profile.externalUrl || profile.website || '',
        isBusinessAccount: Boolean(profile.isBusinessAccount),
        latestPosts: [],
        engagement: undefined
      };
    }

  } catch (error: any) {
    logger('error', 'Profile validation failed', { 
      error: error.message, 
      responseDataType: typeof responseData,
      responseDataKeys: typeof responseData === 'object' && responseData ? Object.keys(responseData).slice(0, 20) : 'not-object'
    });
    throw new Error(`Profile validation failed: ${error.message}`);
  }
}
export function calculateConfidenceLevel(profile: ProfileData, analysisType: string): number {
  let confidence = 50;
  if (profile.dataQuality === 'high') confidence += 30;
  else if (profile.dataQuality === 'medium') confidence += 15;
  if (profile.isVerified) confidence += 10;
  if ((profile.engagement?.postsAnalyzed || 0) > 0) {
    confidence += 20;
    if ((profile.engagement?.postsAnalyzed || 0) >= 5) confidence += 5;
    if ((profile.engagement?.postsAnalyzed || 0) >= 10) confidence += 5;
  }
  if (analysisType === 'deep') confidence += 10;
  if (profile.isPrivate) confidence -= 15;
  return Math.min(95, Math.max(20, confidence));
}

export function extractPostThemes(posts: PostData[]): string {
  if (!posts || posts.length === 0) return 'content themes not available';
  const allHashtags = posts.flatMap(post => post.hashtags || []);
  const hashtagCounts = allHashtags.reduce((acc, tag) => {
    acc[tag] = (acc[tag] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const topHashtags = Object.entries(hashtagCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([tag]) => tag.replace('#', ''));
  return topHashtags.length > 0 ? 
    topHashtags.join(', ') : 'content themes not available';
}
