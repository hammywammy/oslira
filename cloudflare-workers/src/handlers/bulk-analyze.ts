import type { Context } from 'hono';
import type { AnalysisRequest, ProfileData, BusinessProfile } from '../types/interfaces.js';
import { generateRequestId, logger } from '../utils/logger.js';
import { createStandardResponse } from '../utils/response.js';
import { extractUsername } from '../utils/validation.js';
import { fetchUserAndCredits, fetchBusinessProfile, saveLeadAndAnalysis, updateCreditsAndTransaction } from '../services/database.js';
import { scrapeInstagramProfile } from '../services/instagram-scraper.js';
import { performAIAnalysis, generateOutreachMessage } from '../services/ai-analysis.js';

export async function handleBulkAnalyze(c: Context): Promise<Response> {
  const requestId = generateRequestId();
  
  try {
    const body = await c.req.json();
    const { profiles, analysis_type, business_id, user_id } = body;
    
    if (!Array.isArray(profiles) || profiles.length === 0) {
      return c.json(createStandardResponse(
        false, 
        undefined, 
        'Profiles array is required', 
        requestId
      ), 400);
    }

    if (profiles.length > 50) {
      return c.json(createStandardResponse(
        false, 
        undefined, 
        'Maximum 50 profiles per bulk request', 
        requestId
      ), 400);
    }

    logger('info', 'Bulk analysis started', { 
      profileCount: profiles.length, 
      analysisType: analysis_type, 
      requestId
    });

    const validatedProfiles = profiles.map(profileUrl => {
      const username = extractUsername(profileUrl);
      if (!username) {
        throw new Error(`Invalid profile URL: ${profileUrl}`);
      }
      return { username, profileUrl };
    });

    const userResult = await fetchUserAndCredits(user_id, c.env);
    const business = await fetchBusinessProfile(business_id, user_id, c.env);

    const costPerProfile = analysis_type === 'xray' ? 3 : (analysis_type === 'deep' ? 2 : 1);
    const totalCost = validatedProfiles.length * costPerProfile;
    
    if (userResult.credits < totalCost) {
      return c.json(createStandardResponse(
        false, 
        undefined, 
        'Insufficient credits', 
        requestId
      ), 402);
    }

    const results = [];
    let successful = 0;
    let failed = 0;
    let creditsUsed = 0;

    for (const profile of validatedProfiles) {
      try {
        logger('info', 'Processing bulk profile', { username: profile.username });

        const profileData = await scrapeInstagramProfile(profile.username, analysis_type, c.env);
        const analysisResult = await performAIAnalysis(profileData, business, analysis_type, c.env, requestId);
        
        let outreachMessage = '';
if (analysis_type === 'deep') {
  try {
    outreachMessage = await generateOutreachMessage(profileData, business, analysisResult, c.env, requestId);
  } catch (messageError: any) {
    logger('warn', 'Message generation failed for bulk profile', { 
      username: profile.username, 
      error: messageError.message 
    });
  }
}

if (analysis_type === 'xray') {
  try {
    outreachMessage = await generateOutreachMessage(profileData, business, analysisResult, c.env, requestId);
  } catch (messageError: any) {
    logger('warn', 'Message generation failed for bulk profile', { 
      username: profile.username, 
      error: messageError.message 
    });
  }
}

        const leadData = {
          user_id: user_id,
          business_id: business_id,
          username: profileData.username,
          platform: 'instagram',
          profile_url: profile.profileUrl,
          profile_pic_url: profileData.profilePicUrl || null,
          score: analysisResult.score || 0,
          analysis_type: analysis_type,
          followers_count: profileData.followersCount || 0,
          created_at: new Date().toISOString(),
          quick_summary: analysisResult.quick_summary || null
        };

        let analysisData = null;
        if (analysis_type === 'deep') {
          analysisData = {
            user_id: user_id,
            username: profileData.username,
            analysis_type: 'deep',
            score: analysisResult.score || 0,
            engagement_score: analysisResult.engagement_score || 0,
            score_niche_fit: analysisResult.niche_fit || 0,
            score_total: analysisResult.score || 0,
            niche_fit: analysisResult.niche_fit || 0,
            audience_quality: analysisResult.audience_quality || 'Unknown',
            engagement_insights: analysisResult.engagement_insights || 'No insights available',
            outreach_message: outreachMessage || null,
            selling_points: Array.isArray(analysisResult.selling_points) ? 
              analysisResult.selling_points : 
              (analysisResult.selling_points ? [analysisResult.selling_points] : null),
            reasons: Array.isArray(analysisResult.reasons) ? analysisResult.reasons : 
              (Array.isArray(analysisResult.selling_points) ? analysisResult.selling_points : null),
            avg_comments: profileData.engagement?.avgComments || 0,
            avg_likes: profileData.engagement?.avgLikes || 0,
            engagement_rate: profileData.engagement?.engagementRate || 0,
            latest_posts: profileData.latestPosts ? JSON.stringify(profileData.latestPosts) : null,
            engagement_data: profileData.engagement ? JSON.stringify({
              avgLikes: profileData.engagement.avgLikes,
              avgComments: profileData.engagement.avgComments,
              engagementRate: profileData.engagement.engagementRate,
              postsAnalyzed: profileData.engagement.postsAnalyzed,
              dataSource: 'real_scraped_data'
            }) : JSON.stringify({ dataSource: 'no_real_data_available' }),
            analysis_data: JSON.stringify({
              confidence_level: analysisResult.confidence_level,
              real_engagement_available: (profileData.engagement?.postsAnalyzed || 0) > 0
            }),
            deep_summary: analysisResult.deep_summary || null,
            created_at: new Date().toISOString()
          };
        }

        const lead_id = await saveLeadAndAnalysis(leadData, analysisData, analysis_type, c.env);

        results.push({
          username: profile.username,
          success: true,
          lead_id,
          score: analysisResult.score,
          confidence_level: analysisResult.confidence_level,
          data_quality: profileData.dataQuality,
          real_engagement_available: (profileData.engagement?.postsAnalyzed || 0) > 0,
          ...(analysis_type === 'deep' && {
            engagement_score: analysisResult.engagement_score,
            niche_fit: analysisResult.niche_fit,
            outreach_message: outreachMessage,
            posts_analyzed: profileData.engagement?.postsAnalyzed || 0
          })
        });

        successful++;
        creditsUsed += costPerProfile;

        logger('info', 'Bulk profile processed successfully', { 
          username: profile.username, 
          score: analysisResult.score,
          dataQuality: profileData.dataQuality
        });

      } catch (error: any) {
        logger('error', 'Bulk profile processing failed', { 
          username: profile.username, 
          error: error.message 
        });

        results.push({
          username: profile.username,
          success: false,
          error: error.message
        });

        failed++;
      }
    }

    if (creditsUsed > 0) {
      try {
        await updateCreditsAndTransaction(
          user_id,
          creditsUsed,
          userResult.credits - creditsUsed,
          `Bulk ${analysis_type} analysis (${successful} profiles)`,
          'use',
          c.env
        );
      } catch (creditError: any) {
        logger('error', 'Bulk credit update failed', { error: creditError.message });
        return c.json(createStandardResponse(
          false, 
          undefined, 
          `Analysis completed but credit update failed: ${creditError.message}`, 
          requestId
        ), 500);
      }
    }

    const responseData = {
      summary: {
        total: validatedProfiles.length,
        successful,
        failed,
        creditsUsed,
        average_confidence: successful > 0 ? 
          Math.round(results.filter(r => r.success).reduce((sum, r) => sum + (r.confidence_level || 0), 0) / successful) : 0,
        real_engagement_profiles: results.filter(r => r.success && r.real_engagement_available).length
      },
      results,
      credits: {
        remaining: userResult.credits - creditsUsed
      }
    };

    logger('info', 'Bulk analysis completed', { 
      total: validatedProfiles.length, 
      successful, 
      failed, 
      creditsUsed
    });

    return c.json(createStandardResponse(true, responseData, undefined, requestId));

  } catch (error: any) {
    logger('error', 'Bulk analysis failed', { error: error.message, requestId });
    return c.json(createStandardResponse(
      false, 
      undefined, 
      error.message, 
      requestId
    ), 500);
  }
}
