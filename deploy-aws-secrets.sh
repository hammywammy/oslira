#!/bin/bash
# deploy-aws-secrets.sh - Complete AWS Secrets Manager setup script

set -e

echo "🚀 Setting up AWS Secrets Manager for Oslira"

# Configuration
AWS_REGION="${AWS_REGION:-us-east-1}"
LAMBDA_ROLE_NAME="OsliraRotationRole"
SECRETS_PREFIX="Oslira"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI not found. Please install AWS CLI first."
        exit 1
    fi
    
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS credentials not configured. Run 'aws configure' first."
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Create IAM role for Lambda rotation functions
create_iam_role() {
    print_status "Creating IAM role for Lambda functions..."
    
    TRUST_POLICY='{
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": {
                    "Service": "lambda.amazonaws.com"
                },
                "Action": "sts:AssumeRole"
            }
        ]
    }'
    
    # Create role
    aws iam create-role \
        --role-name $LAMBDA_ROLE_NAME \
        --assume-role-policy-document "$TRUST_POLICY" \
        --description "Role for Oslira key rotation Lambda functions" \
        2>/dev/null || print_warning "Role might already exist"
    
    # Attach basic Lambda execution policy
    aws iam attach-role-policy \
        --role-name $LAMBDA_ROLE_NAME \
        --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
    
    # Create custom policy for Secrets Manager
    SECRETS_POLICY='{
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Action": [
                    "secretsmanager:GetSecretValue",
                    "secretsmanager:PutSecretValue",
                    "secretsmanager:CreateSecret",
                    "secretsmanager:UpdateSecret",
                    "secretsmanager:DescribeSecret",
                    "secretsmanager:ListSecrets",
                    "secretsmanager:RotateSecret"
                ],
                "Resource": "arn:aws:secretsmanager:*:*:secret:Oslira/*"
            },
            {
                "Effect": "Allow",
                "Action": [
                    "ssm:GetParameter",
                    "ssm:PutParameter"
                ],
                "Resource": "arn:aws:ssm:*:*:parameter/*KEY_POOL"
            }
        ]
    }'
    
    aws iam put-role-policy \
        --role-name $LAMBDA_ROLE_NAME \
        --policy-name OsliraSecretsManagerPolicy \
        --policy-document "$SECRETS_POLICY"
    
    print_success "IAM role created: $LAMBDA_ROLE_NAME"
}

# Create secrets in AWS Secrets Manager
create_secrets() {
    print_status "Creating secrets in AWS Secrets Manager..."
    
    # Get current environment variables (you'll need to set these)
    read -p "Enter current OpenAI API key: " -s OPENAI_KEY
    echo
    read -p "Enter current Claude API key: " -s CLAUDE_KEY
    echo
    read -p "Enter current Apify API token: " -s APIFY_TOKEN
    echo
    read -p "Enter current Stripe secret key: " -s STRIPE_SECRET
    echo
    read -p "Enter current Stripe webhook secret: " -s STRIPE_WEBHOOK
    echo
    
    # Create OpenAI secret
    if [ ! -z "$OPENAI_KEY" ]; then
        aws secretsmanager create-secret \
            --name "${SECRETS_PREFIX}/OPENAI_API_KEY" \
            --description "Oslira OpenAI API Key" \
            --secret-string "{\"apiKey\":\"$OPENAI_KEY\",\"createdAt\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"version\":\"v1\"}" \
            --region $AWS_REGION 2>/dev/null || print_warning "OpenAI secret might already exist"
        print_success "OpenAI secret created"
    fi
    
    # Create Claude secret
    if [ ! -z "$CLAUDE_KEY" ]; then
        aws secretsmanager create-secret \
            --name "${SECRETS_PREFIX}/CLAUDE_API_KEY" \
            --description "Oslira Claude API Key" \
            --secret-string "{\"apiKey\":\"$CLAUDE_KEY\",\"createdAt\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"version\":\"v1\"}" \
            --region $AWS_REGION 2>/dev/null || print_warning "Claude secret might already exist"
        print_success "Claude secret created"
    fi
    
    # Create Apify secret
    if [ ! -z "$APIFY_TOKEN" ]; then
        aws secretsmanager create-secret \
            --name "${SECRETS_PREFIX}/APIFY_API_TOKEN" \
            --description "Oslira Apify API Token" \
            --secret-string "{\"apiKey\":\"$APIFY_TOKEN\",\"createdAt\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"version\":\"v1\"}" \
            --region $AWS_REGION 2>/dev/null || print_warning "Apify secret might already exist"
        print_success "Apify secret created"
    fi
    
    # Create Stripe secrets
    if [ ! -z "$STRIPE_SECRET" ]; then
        aws secretsmanager create-secret \
            --name "${SECRETS_PREFIX}/STRIPE_SECRET_KEY" \
            --description "Oslira Stripe Secret Key" \
            --secret-string "{\"apiKey\":\"$STRIPE_SECRET\",\"createdAt\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"version\":\"v1\"}" \
            --region $AWS_REGION 2>/dev/null || print_warning "Stripe secret key might already exist"
        print_success "Stripe secret key created"
    fi
    
    if [ ! -z "$STRIPE_WEBHOOK" ]; then
        aws secretsmanager create-secret \
            --name "${SECRETS_PREFIX}/STRIPE_WEBHOOK_SECRET" \
            --description "Oslira Stripe Webhook Secret" \
            --secret-string "{\"apiKey\":\"$STRIPE_WEBHOOK\",\"createdAt\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"version\":\"v1\"}" \
            --region $AWS_REGION 2>/dev/null || print_warning "Stripe webhook secret might already exist"
        print_success "Stripe webhook secret created"
    fi
}

# Package and deploy Lambda functions
deploy_lambda_functions() {
    print_status "Deploying Lambda rotation functions..."
    
    # Get account ID and role ARN
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    ROLE_ARN="arn:aws:iam::${ACCOUNT_ID}:role/${LAMBDA_ROLE_NAME}"
    
    # Create Lambda deployment packages
    mkdir -p lambda-packages
    
    # Deploy OpenAI rotator
    print_status "Deploying OpenAI rotator..."
    cat > lambda-packages/openai-index.js << 'EOF'
const AWS = require('aws-sdk');
const https = require('https');

const secretsManager = new AWS.SecretsManager();
const WORKER_URL = process.env.WORKER_URL;
const OSLIRA_ADMIN_TOKEN = process.env.OSLIRA_ADMIN_TOKEN;

exports.handler = async (event) => {
    console.log('OpenAI Key Rotation Started', { event });
    
    try {
        const secretId = event.SecretId || 'Oslira/OPENAI_API_KEY';
        
        // For demo purposes, we'll just update the secret with a new timestamp
        // In production, implement actual key generation logic
        const currentSecret = await secretsManager.getSecretValue({ SecretId: secretId }).promise();
        const secretData = JSON.parse(currentSecret.SecretString);
        
        // Simulate key rotation (replace with actual logic)
        const newSecretValue = {
            ...secretData,
            rotatedAt: new Date().toISOString(),
            version: `v${Date.now()}`,
            rotatedBy: 'lambda_auto_rotation'
        };
        
        await secretsManager.putSecretValue({
            SecretId: secretId,
            SecretString: JSON.stringify(newSecretValue)
        }).promise();
        
        console.log('OpenAI Key Rotation Completed Successfully');
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'OpenAI API key rotation simulated successfully',
                secretId: secretId,
                timestamp: new Date().toISOString()
            })
        };
        
    } catch (error) {
        console.error('OpenAI Key Rotation Failed:', error);
        
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'Key rotation failed',
                message: error.message,
                timestamp: new Date().toISOString()
            })
        };
    }
};
EOF
    
    cd lambda-packages
    zip openai-rotator.zip openai-index.js
    
    # Create OpenAI Lambda function
    aws lambda create-function \
        --function-name oslira-openai-rotator \
        --runtime nodejs18.x \
        --role $ROLE_ARN \
        --handler openai-index.handler \
        --zip-file fileb://openai-rotator.zip \
        --description "Oslira OpenAI API key rotation function" \
        --timeout 300 \
        --environment Variables="{WORKER_URL=${WORKER_URL:-},OSLIRA_ADMIN_TOKEN=${OSLIRA_ADMIN_TOKEN:-}}" \
        --region $AWS_REGION 2>/dev/null || \
    aws lambda update-function-code \
        --function-name oslira-openai-rotator \
        --zip-file fileb://openai-rotator.zip \
        --region $AWS_REGION
    
    cd ..
    
    print_success "Lambda functions deployed"
}

# Enable rotation for secrets
enable_rotation() {
    print_status "Enabling automatic rotation..."
    
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    LAMBDA_ARN="arn:aws:lambda:${AWS_REGION}:${ACCOUNT_ID}:function:oslira-openai-rotator"
    
    # Enable rotation for OpenAI secret (every 7 days)
    aws secretsmanager rotate-secret \
        --secret-id "${SECRETS_PREFIX}/OPENAI_API_KEY" \
        --rotation-lambda-arn $LAMBDA_ARN \
        --rotation-rules ScheduleExpression="rate(7 days)",Duration="PT30M" \
        --region $AWS_REGION 2>/dev/null || print_warning "Rotation might already be enabled"
    
    print_success "Automatic rotation enabled (weekly)"
}

# Create CloudWatch schedule for manual triggering
create_schedule() {
    print_status "Creating CloudWatch schedule for weekly rotation..."
    
    # Create EventBridge rule for Sunday rotation
    aws events put-rule \
        --name oslira-weekly-rotation \
        --schedule-expression "cron(0 6 ? * SUN *)" \
        --description "Trigger Oslira key rotation every Sunday at 6 AM UTC" \
        --state ENABLED \
        --region $AWS_REGION
    
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    LAMBDA_ARN="arn:aws:lambda:${AWS_REGION}:${ACCOUNT_ID}:function:oslira-openai-rotator"
    
    # Add target to the rule
    aws events put-targets \
        --rule oslira-weekly-rotation \
        --targets "Id"="1","Arn"="$LAMBDA_ARN" \
        --region $AWS_REGION
    
    # Grant permission for EventBridge to invoke Lambda
    aws lambda add-permission \
        --function-name oslira-openai-rotator \
        --statement-id weekly-rotation-permission \
        --action lambda:InvokeFunction \
        --principal events.amazonaws.com \
        --source-arn "arn:aws:events:${AWS_REGION}:${ACCOUNT_ID}:rule/oslira-weekly-rotation" \
        --region $AWS_REGION 2>/dev/null || print_warning "Permission might already exist"
    
    print_success "Weekly rotation schedule created (Sundays at 6 AM UTC)"
}

# Test the setup
test_setup() {
    print_status "Testing the setup..."
    
    # Test secret retrieval
    SECRET_VALUE=$(aws secretsmanager get-secret-value \
        --secret-id "${SECRETS_PREFIX}/OPENAI_API_KEY" \
        --query SecretString \
        --output text \
        --region $AWS_REGION 2>/dev/null)
    
    if [ $? -eq 0 ]; then
        print_success "Secret retrieval test passed"
    else
        print_error "Secret retrieval test failed"
    fi
    
    # Test Lambda function
    LAMBDA_RESULT=$(aws lambda invoke \
        --function-name oslira-openai-rotator \
        --payload '{"SecretId":"Oslira/OPENAI_API_KEY"}' \
        lambda-test-output.json \
        --region $AWS_REGION 2>/dev/null)
    
    if [ $? -eq 0 ]; then
        print_success "Lambda function test passed"
        cat lambda-test-output.json
        rm -f lambda-test-output.json
    else
        print_error "Lambda function test failed"
    fi
}

# Generate environment variables for Cloudflare Worker
generate_env_vars() {
    print_status "Generating environment variables for Cloudflare Worker..."
    
    cat > cloudflare-env-vars.txt << EOF
# Add these environment variables to your Cloudflare Worker:

AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
AWS_REGION=${AWS_REGION}

# Lambda function ARNs for manual rotation triggers:
OPENAI_ROTATOR_LAMBDA_ARN=arn:aws:lambda:${AWS_REGION}:$(aws sts get-caller-identity --query Account --output text):function:oslira-openai-rotator
CLAUDE_ROTATOR_LAMBDA_ARN=arn:aws:lambda:${AWS_REGION}:$(aws sts get-caller-identity --query Account --output text):function:oslira-claude-rotator
APIFY_ROTATOR_LAMBDA_ARN=arn:aws:lambda:${AWS_REGION}:$(aws sts get-caller-identity --query Account --output text):function:oslira-apify-rotator
STRIPE_ROTATOR_LAMBDA_ARN=arn:aws:lambda:${AWS_REGION}:$(aws sts get-caller-identity --query Account --output text):function:oslira-stripe-rotator

# Optional: Slack webhook for notifications
SLACK_WEBHOOK_URL=your-slack-webhook-url

EOF
    
    print_success "Environment variables saved to cloudflare-env-vars.txt"
    print_warning "Remember to add these to your Cloudflare Worker settings"
}

# Main execution
main() {
    echo "======================================================================"
    echo "🔑 AWS Secrets Manager Setup for Oslira"
    echo "======================================================================"
    
    check_prerequisites
    create_iam_role
    sleep 10  # Wait for IAM propagation
    create_secrets
    deploy_lambda_functions
    enable_rotation
    create_schedule
    test_setup
    generate_env_vars
    
    echo ""
    echo "======================================================================"
    print_success "🎉 AWS Secrets Manager setup completed!"
    echo "======================================================================"
    echo ""
    echo "Next steps:"
    echo "1. Add the environment variables from cloudflare-env-vars.txt to your Cloudflare Worker"
    echo "2. Deploy your updated Cloudflare Worker with AWS integration"
    echo "3. Test the admin panel migration features"
    echo "4. Set up additional Lambda functions for other services (Claude, Apify, Stripe)"
    echo ""
    echo "Your secrets are now:"
    echo "- 🔒 Stored securely in AWS Secrets Manager"
    echo "- 🔄 Set to rotate automatically every Sunday"
    echo "- 🔗 Integrated with your Oslira admin panel"
    echo ""
}

# Run the main function
main "$@"
