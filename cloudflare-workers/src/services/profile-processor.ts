import type { AnalysisResponse } from '../types/interfaces.js';
import { extractUsername, normalizeRequest } from '../utils/validation.js';
import { logger } from '../utils/logger.js';

export async function processProfileComplete(
  profileUrl: string, 
  analysisType: string, 
  context: { user_id: string, business_id: string, business: any, env: any, requestId: string }
): Promise<AnalysisResponse> {
  try {
    // Import analyze handler to reuse logic
    const { handleAnalyze } = await import('../handlers/analyze.js');
    
    // Create mock request object for internal processing
    const mockRequest = {
      json: async () => ({
        profile_url: profileUrl,
        username: extractUsername(profileUrl),
        analysis_type: analysisType,
        business_id: context.business_id,
        user_id: context.user_id
      }),
      header: () => null,
      query: () => null
    };
    
    const mockContext = {
      env: context.env,
      json: (data: any) => ({ data }),
      req: mockRequest
    };
    
    // Process through main analyze pipeline
    const response = await handleAnalyze(mockContext as any);
    const responseData = response.data;
    
    if (!responseData.success) {
      throw new Error(responseData.error || 'Analysis failed');
    }
    
    return responseData.data;
    
  } catch (error: any) {
    logger('error', 'Profile processing failed', { 
      profileUrl, 
      error: error.message,
      requestId: context.requestId 
    });
    throw error;
  }
}

export function calculateBulkCosts(results: AnalysisResponse[]): {
  totalCredits: number;
  totalActualCost: number;
  avgCostPerAnalysis: number;
  creditEfficiency: number;
} {
  if (results.length === 0) {
    return {
      totalCredits: 0,
      totalActualCost: 0,
      avgCostPerAnalysis: 0,
      creditEfficiency: 0
    };
  }

  const totalCredits = results.reduce((sum, result) => sum + (result.credits?.used || 0), 0);
  const totalActualCost = results.reduce((sum, result) => sum + (result.credits?.actual_cost || 0), 0);
  const avgCostPerAnalysis = totalCredits / results.length;
  const creditEfficiency = totalActualCost > 0 ? (totalCredits / totalActualCost) : 0;

  return {
    totalCredits,
    totalActualCost,
    avgCostPerAnalysis: Math.round(avgCostPerAnalysis * 100) / 100,
    creditEfficiency: Math.round(creditEfficiency * 100) / 100
  };
}
