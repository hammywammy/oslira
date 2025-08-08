app.post('/v1/analyze', async (c) => {
  const requestId = generateRequestId();
  
  try {
    const body = await c.req.json();
    const data = normalizeRequest(body);
    const { username, analysis_type, business_id, user_id, profile_url } = data;
    
    logger('info', 'Enterprise analysis request started', { 
      username, 
      analysisType: analysis_type, 
      requestId
    });
    
    const [userResult, business] = await Promise.all([
      fetchUserAndCredits(user_id, c.env),
      fetchBusinessProfile(business_id, user_id, c.env)
    ]);
    
    const creditCost = analysis_type === 'deep' ? 2 : 1;
    if (userResult.credits < creditCost) {
      return c.json(createStandardResponse(
        false, 
        undefined, 
        'Insufficient credits', 
        requestId
      ), 402);
    }
    
    // SCRAPE PROFILE
    let profileData: ProfileData;
    try {
      logger('info', 'Starting profile scraping', { username });
      profileData = await scrapeInstagramProfile(username, analysis_type, c.env);
      logger('info', 'Profile scraped successfully', { 
        username: profileData.username, 
        followers: profileData.followersCount,
        postsFound: profileData.latestPosts?.length || 0,
        hasRealEngagement: (profileData.engagement?.postsAnalyzed || 0) > 0,
        dataQuality: profileData.dataQuality,
        scraperUsed: profileData.scraperUsed
      });
    } catch (scrapeError: any) {
      logger('error', 'Profile scraping failed', { 
        username, 
        error: scrapeError.message 
      });
      
      let errorMessage = 'Failed to retrieve profile data';
      if (scrapeError.message.includes('not found')) {
        errorMessage = 'Instagram profile not found';
      } else if (scrapeError.message.includes('private')) {
        errorMessage = 'This Instagram profile is private';
      } else if (scrapeError.message.includes('rate limit') || scrapeError.message.includes('429')) {
        errorMessage = 'Instagram is temporarily limiting requests. Please try again in a few minutes.';
      } else if (scrapeError.message.includes('timeout')) {
        errorMessage = 'Profile scraping timed out. Please try again.';
      }
      
      return c.json(createStandardResponse(
        false, 
        undefined, 
        errorMessage, 
        requestId
      ), 500);
    }

    // AI ANALYSIS
    let analysisResult: AnalysisResult;
    try {
      logger('info', 'Starting AI analysis');
      analysisResult = await performAIAnalysis(profileData, business, analysis_type, c.env, requestId);
      logger('info', 'AI analysis completed', { 
        score: analysisResult.score,
        engagementScore: analysisResult.engagement_score,
        nicheFit: analysisResult.niche_fit,
        confidence: analysisResult.confidence_level,
        hasQuickSummary: !!analysisResult.quick_summary,
        hasDeepSummary: !!analysisResult.deep_summary
      });
    } catch (aiError: any) {
      logger('error', 'AI analysis failed', { error: aiError.message });
      return c.json(createStandardResponse(
        false, 
        undefined, 
        'AI analysis failed', 
        requestId
      ), 500);
    }

    // GENERATE OUTREACH MESSAGE FOR DEEP ANALYSIS
    let outreachMessage = '';
    if (analysis_type === 'deep') {
      try {
        logger('info', 'Generating outreach message');
        outreachMessage = await generateOutreachMessage(profileData, business, analysisResult, c.env, requestId);
        logger('info', 'Outreach message generated', { length: outreachMessage.length });
      } catch (messageError: any) {
        logger('warn', 'Message generation failed (non-fatal)', { error: messageError.message });
      }
    }

    // PREPARE LEAD DATA
    const leadData = {
      user_id: user_id,
      business_id: business_id,
      username: profileData.username,
      platform: 'instagram',
      profile_url: profile_url,
      profile_pic_url: profileData.profilePicUrl || null,
      score: analysisResult.score || 0,
      analysis_type: analysis_type,
      followers_count: profileData.followersCount || 0,
      created_at: new Date().toISOString(),
      quick_summary: analysisResult.quick_summary || null
    };

    // PREPARE ANALYSIS DATA FOR DEEP ANALYSIS
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
        avg_likes: profileData.engagement?.avgLikes || 0,
        avg_comments: profileData.engagement?.avgComments || 0,
        engagement_rate: profileData.engagement?.engagementRate || 0,
        audience_quality: analysisResult.audience_quality || 'Unknown',
        engagement_insights: analysisResult.engagement_insights || 'No insights available',
        selling_points: Array.isArray(analysisResult.selling_points) ? 
          analysisResult.selling_points : 
          (analysisResult.selling_points ? [analysisResult.selling_points] : null),
        reasons: Array.isArray(analysisResult.reasons) ? analysisResult.reasons : 
          (Array.isArray(analysisResult.selling_points) ? analysisResult.selling_points : null),
        latest_posts: (profileData.latestPosts?.length || 0) > 0 ? 
          JSON.stringify(profileData.latestPosts.slice(0, 12)) : null,
        engagement_data: profileData.engagement ? JSON.stringify({
          avgLikes: profileData.engagement.avgLikes,
          avgComments: profileData.engagement.avgComments,
          engagementRate: profileData.engagement.engagementRate,
          totalEngagement: profileData.engagement.totalEngagement,
          postsAnalyzed: profileData.engagement.postsAnalyzed,
          dataQuality: profileData.dataQuality,
          scraperUsed: profileData.scraperUsed,
          dataSource: 'real_scraped_data',
          calculationMethod: 'manual_averaging_from_posts'
        }) : JSON.stringify({
          dataSource: 'no_real_data_available',
          reason: 'scraping_failed_or_private_account',
          scraperUsed: profileData.scraperUsed,
          estimatedData: false
        }),
        analysis_data: JSON.stringify({
          confidence_level: analysisResult.confidence_level || calculateConfidenceLevel(profileData, analysis_type),
          scraper_used: profileData.scraperUsed,
          data_quality: profileData.dataQuality,
          posts_found: profileData.latestPosts?.length || 0,
          posts_with_engagement: profileData.latestPosts?.filter(p => p.likesCount > 0 || p.commentsCount > 0).length || 0,
          real_engagement_available: (profileData.engagement?.postsAnalyzed || 0) > 0,
          follower_count: profileData.followersCount,
          verification_status: profileData.isVerified,
          account_type: profileData.isPrivate ? 'private' : 'public',
          analysis_timestamp: new Date().toISOString(),
          ai_model_used: 'gpt-4o'
        }),
        outreach_message: outreachMessage || null,
        deep_summary: analysisResult.deep_summary || null,
        created_at: new Date().toISOString()
      };
    }

    // SAVE TO DATABASE
    let lead_id: string;
    try {
      logger('info', 'Saving data to database');
      lead_id = await saveLeadAndAnalysis(leadData, analysisData, analysis_type, c.env);
      logger('info', 'Database save successful', { lead_id });
    } catch (saveError: any) {
      logger('error', 'Database save failed', { error: saveError.message });
      return c.json(createStandardResponse(
        false, 
        undefined, 
        `Database save failed: ${saveError.message}`, 
        requestId
      ), 500);
    }

    // UPDATE CREDITS
    try {
      await updateCreditsAndTransaction(
        user_id,
        creditCost,
        userResult.credits - creditCost,
        `${analysis_type} analysis for @${profileData.username}`,
        'use',
        c.env,
        lead_id
      );
      logger('info', 'Credits updated successfully', { 
        creditCost, 
        remainingCredits: userResult.credits - creditCost 
      });
    } catch (creditError: any) {
      logger('error', 'Credit update failed', { error: creditError.message });
      return c.json(createStandardResponse(
        false, 
        undefined, 
        `Failed to log credit transaction: ${creditError.message}`, 
        requestId
      ), 500);
    }

    // PREPARE RESPONSE
    const responseData = {
      lead_id,
      profile: {
        username: profileData.username,
        displayName: profileData.displayName,
        followersCount: profileData.followersCount,
        isVerified: profileData.isVerified,
        profilePicUrl: profileData.profilePicUrl,
        dataQuality: profileData.dataQuality,
        scraperUsed: profileData.scraperUsed
      },
      analysis: {
        score: analysisResult.score,
        type: analysis_type,
        confidence_level: analysisResult.confidence_level,
        quick_summary: analysisResult.quick_summary,
        ...(analysis_type === 'deep' && {
          engagement_score: analysisResult.engagement_score,
          niche_fit: analysisResult.niche_fit,
          audience_quality: analysisResult.audience_quality,
          selling_points: analysisResult.selling_points,
          reasons: analysisResult.reasons,
          outreach_message: outreachMessage,
          deep_summary: analysisResult.deep_summary,
          engagement_data: profileData.engagement ? {
            avg_likes: profileData.engagement.avgLikes,
            avg_comments: profileData.engagement.avgComments,
            engagement_rate: profileData.engagement.engagementRate,
            posts_analyzed: profileData.engagement.postsAnalyzed,
            data_source: 'real_scraped_calculation'
          } : {
            data_source: 'no_real_data_available',
            avg_likes: 0,
            avg_comments: 0,
            engagement_rate: 0
          }
        })
      },
      credits: {
        used: creditCost,
        remaining: userResult.credits - creditCost
      }
    };

    logger('info', 'Analysis completed successfully', { 
      lead_id, 
      username: profileData.username, 
      score: analysisResult.score,
      confidence: analysisResult.confidence_level,
      dataQuality: profileData.dataQuality
    });

    return c.json(createStandardResponse(true, responseData, undefined, requestId));

  } catch (error: any) {
    logger('error', 'Analysis request failed', { error: error.message, requestId });
    return c.json(createStandardResponse(
      false, 
      undefined, 
      error.message, 
      requestId
    ), 500);
  }
});

export async function handleAnalyze(c: Context): Promise<Response>
