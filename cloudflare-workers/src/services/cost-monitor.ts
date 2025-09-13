import { logger } from '../utils/logger.js';

export interface CostAlert {
  user_id: string;
  analysis_type: string;
  actual_cost: number;
  tokens_used: number;
  margin_percent: number;
  alert_type: 'high_cost' | 'low_margin' | 'token_cap' | 'suspicious_usage';
}

export async function monitorCosts(
  user_id: string,
  analysis_type: string,
  costDetails: any,
  env: any
): Promise<CostAlert[]> {
  
  const alerts: CostAlert[] = [];
  const totalTokens = costDetails.tokens_in + costDetails.tokens_out;
  const margin = (costDetails.margin || 0);
  const marginPercent = costDetails.actual_cost > 0 ? (margin / costDetails.actual_cost) * 100 : 0;

  // High cost alert
  if (costDetails.actual_cost > 0.05) { // > $0.05
    alerts.push({
      user_id,
      analysis_type,
      actual_cost: costDetails.actual_cost,
      tokens_used: totalTokens,
      margin_percent: marginPercent,
      alert_type: 'high_cost'
    });
  }

  // Low margin alert
  if (marginPercent < 20) { // < 20% margin
    alerts.push({
      user_id,
      analysis_type,
      actual_cost: costDetails.actual_cost,
      tokens_used: totalTokens,
      margin_percent: marginPercent,
      alert_type: 'low_margin'
    });
  }

  // Token cap alert
  if (totalTokens > 2200) {
    alerts.push({
      user_id,
      analysis_type,
      actual_cost: costDetails.actual_cost,
      tokens_used: totalTokens,
      margin_percent: marginPercent,
      alert_type: 'token_cap'
    });
  }

  // Log alerts
  if (alerts.length > 0) {
    logger('warn', 'Cost monitoring alerts generated', {
      user_id,
      alerts: alerts.map(a => a.alert_type),
      actual_cost: costDetails.actual_cost,
      margin_percent: marginPercent,
      tokens: totalTokens
    });
  }

  return alerts;
}
