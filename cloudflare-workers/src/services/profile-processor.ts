export async function processProfileComplete(
  profileUrl: string, 
  analysisType: string, 
  context: { user_id, business_id, business, env, requestId }
): Promise<AnalysisResponse>

export function calculateBulkCosts(results: AnalysisResponse[]): BulkCostDetails
