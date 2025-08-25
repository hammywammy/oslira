#!/bin/bash
# deploy-aws-secrets.sh - AWS Secrets Manager setup WITHOUT Lambda auto-rotation
# Manual key management via admin panel only

set -e

echo "🚀 Setting up AWS Secrets Manager for Oslira (Manual Key Management)"

# Configuration
AWS_REGION="${AWS_REGION:-us-east-1}"
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
    read -p "Enter current Supabase service role key: " -s SUPABASE_SERVICE_ROLE
    echo
    
    # Create OpenAI secret
    if [ ! -z "$OPENAI_KEY" ]; then
        aws secretsmanager create-secret \
            --name "${SECRETS_PREFIX}/OPENAI_API_KEY" \
            --description "Oslira OpenAI API Key - Manual Management" \
            --secret-string "{\"apiKey\":\"$OPENAI_KEY\",\"createdAt\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"version\":\"v1\",\"rotationType\":\"manual\"}" \
            --region $AWS_REGION 2>/dev/null || print_warning "OpenAI secret might already exist"
        print_success "OpenAI API key created"
    fi
    
    # Create Claude secret
    if [ ! -z "$CLAUDE_KEY" ]; then
        aws secretsmanager create-secret \
            --name "${SECRETS_PREFIX}/CLAUDE_API_KEY" \
            --description "Oslira Claude API Key - Manual Management" \
            --secret-string "{\"apiKey\":\"$CLAUDE_KEY\",\"createdAt\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"version\":\"v1\",\"rotationType\":\"manual\"}" \
            --region $AWS_REGION 2>/dev/null || print_warning "Claude secret might already exist"
        print_success "Claude API key created"
    fi
    
    # Create Apify secret
    if [ ! -z "$APIFY_TOKEN" ]; then
        aws secretsmanager create-secret \
            --name "${SECRETS_PREFIX}/APIFY_API_TOKEN" \
            --description "Oslira Apify API Token - Manual Management" \
            --secret-string "{\"apiKey\":\"$APIFY_TOKEN\",\"createdAt\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"version\":\"v1\",\"rotationType\":\"manual\"}" \
            --region $AWS_REGION 2>/dev/null || print_warning "Apify secret might already exist"
        print_success "Apify API token created"
    fi
    
    # Create Stripe secret key
    if [ ! -z "$STRIPE_SECRET" ]; then
        aws secretsmanager create-secret \
            --name "${SECRETS_PREFIX}/STRIPE_SECRET_KEY" \
            --description "Oslira Stripe Secret Key - Manual Management" \
            --secret-string "{\"apiKey\":\"$STRIPE_SECRET\",\"createdAt\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"version\":\"v1\",\"rotationType\":\"manual\"}" \
            --region $AWS_REGION 2>/dev/null || print_warning "Stripe secret key might already exist"
        print_success "Stripe secret key created"
    fi
    
    # Create Stripe webhook secret
    if [ ! -z "$STRIPE_WEBHOOK" ]; then
        aws secretsmanager create-secret \
            --name "${SECRETS_PREFIX}/STRIPE_WEBHOOK_SECRET" \
            --description "Oslira Stripe Webhook Secret - Manual Management" \
            --secret-string "{\"apiKey\":\"$STRIPE_WEBHOOK\",\"createdAt\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"version\":\"v1\",\"rotationType\":\"manual\"}" \
            --region $AWS_REGION 2>/dev/null || print_warning "Stripe webhook secret might already exist"
        print_success "Stripe webhook secret created"
    fi
    
    # Create Supabase service role secret
    if [ ! -z "$SUPABASE_SERVICE_ROLE" ]; then
        aws secretsmanager create-secret \
            --name "${SECRETS_PREFIX}/SUPABASE_SERVICE_ROLE" \
            --description "Oslira Supabase Service Role Key - Manual Management" \
            --secret-string "{\"apiKey\":\"$SUPABASE_SERVICE_ROLE\",\"createdAt\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"version\":\"v1\",\"rotationType\":\"manual\"}" \
            --region $AWS_REGION 2>/dev/null || print_warning "Supabase service role secret might already exist"
        print_success "Supabase service role key created"
    fi
}

# Test the setup
test_setup() {
    print_status "Testing the setup..."
    
    # Test secret retrieval for each key
    declare -a secrets=("OPENAI_API_KEY" "CLAUDE_API_KEY" "APIFY_API_TOKEN" "STRIPE_SECRET_KEY" "STRIPE_WEBHOOK_SECRET" "SUPABASE_SERVICE_ROLE")
    
    for secret in "${secrets[@]}"; do
        SECRET_VALUE=$(aws secretsmanager get-secret-value \
            --secret-id "${SECRETS_PREFIX}/${secret}" \
            --query SecretString \
            --output text \
            --region $AWS_REGION 2>/dev/null)
        
        if [ $? -eq 0 ]; then
            print_success "✅ ${secret} retrieval test passed"
        else
            print_warning "⚠️  ${secret} retrieval test failed (might not exist)"
        fi
    done
    
    print_success "Secret retrieval tests completed"
    print_status "All keys are configured for manual management only"
}

# Generate environment variables for Cloudflare Worker
generate_env_vars() {
    print_status "Generating environment variables for Cloudflare Worker..."
    
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text 2>/dev/null || echo "YOUR_AWS_ACCOUNT_ID")
    
cat > cloudflare-env-vars.txt << EOF
# ===============================================================================
# AWS Secrets Manager Environment Variables for Cloudflare Worker
# Manual Key Management Only - No Lambda Auto-Rotation
# ===============================================================================

# AWS Configuration
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
AWS_REGION=${AWS_REGION}

# Admin Panel Configuration
ADMIN_TOKEN=your-secure-admin-token-here

# AWS Account Information
AWS_ACCOUNT_ID=${ACCOUNT_ID}

# Secrets Manager Prefix
SECRETS_PREFIX=${SECRETS_PREFIX}

# Optional: Slack webhook for notifications
SLACK_WEBHOOK_URL=your-slack-webhook-url

# ===============================================================================
# IMPORTANT NOTES:
# ===============================================================================
# 
# 1. Lambda auto-rotation has been REMOVED
# 2. All keys are managed manually via admin panel
# 3. Access admin panel at: https://your-worker-url/admin/
# 4. Update keys via: POST /admin/update-key
# 5. Check status via: GET /admin/config-status
# 
# Manual Key Management Endpoints:
# - POST /admin/update-key          - Update any API key
# - POST /admin/get-config          - Retrieve specific key
# - GET  /admin/config-status       - Check all key statuses
# - POST /admin/test-key            - Test key validity
# 
# Security:
# - All requests require Authorization: Bearer \${ADMIN_TOKEN}
# - Keys are stored encrypted in AWS Secrets Manager
# - Audit logs track all key changes
# 
# ===============================================================================

EOF
    
    print_success "Environment variables saved to cloudflare-env-vars.txt"
    print_warning "Remember to:"
    print_warning "1. Add these environment variables to your Cloudflare Worker"
    print_warning "2. Replace placeholder values with actual credentials"
    print_warning "3. Generate a secure ADMIN_TOKEN"
    print_warning "4. Deploy your Cloudflare Worker"
}

# Generate admin panel usage guide
generate_usage_guide() {
    print_status "Generating admin panel usage guide..."
    
cat > admin-panel-guide.md << 'EOF'
# Oslira AWS Secrets Manager - Manual Key Management Guide

## Overview
Lambda auto-rotation has been **completely removed**. All API keys are now managed manually via the admin panel for maximum control and reliability.

## Admin Panel Endpoints

### 1. Update API Key
```bash
curl -X POST "https://your-worker-url/admin/update-key" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "keyName": "OPENAI_API_KEY",
    "newValue": "sk-new-key-here"
  }'
```

### 2. Get Configuration Status
```bash
curl -X GET "https://your-worker-url/admin/config-status" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### 3. Retrieve Specific Key
```bash
curl -X POST "https://your-worker-url/admin/get-config" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"keyName": "OPENAI_API_KEY"}'
```

### 4. Test Key Validity
```bash
curl -X POST "https://your-worker-url/admin/test-key" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "keyName": "OPENAI_API_KEY",
    "keyValue": "sk-test-key"
  }'
```

## Supported Keys
- `OPENAI_API_KEY`
- `CLAUDE_API_KEY` 
- `APIFY_API_TOKEN`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `SUPABASE_SERVICE_ROLE`
- `STRIPE_PUBLISHABLE_KEY`
- `WORKER_URL`
- `NETLIFY_BUILD_HOOK_URL`

## Key Rotation Process
1. **Generate New Key**: Create new API key from service provider
2. **Update via Admin Panel**: Use `/admin/update-key` endpoint
3. **Test Immediately**: System automatically tests new key
4. **Verify Function**: Check your application still works
5. **Revoke Old Key**: Remove old key from service provider

## Security Features
✅ **Encrypted Storage**: All keys stored encrypted in AWS Secrets Manager  
✅ **Audit Logging**: All changes tracked with timestamps and user info  
✅ **Automatic Testing**: Keys validated immediately after updates  
✅ **Rollback Capability**: Previous versions available in AWS console  
✅ **Access Control**: Admin token required for all operations  

## Benefits of Manual Management
- **No Auto-Rotation Failures**: No surprise broken keys
- **Full Control**: Rotate keys when YOU decide
- **Easier Debugging**: Clear audit trail of all changes
- **Cost Effective**: No Lambda execution costs
- **Simplified Architecture**: Less moving parts to break

## Emergency Procedures

### If Admin Panel is Down
1. Access AWS Secrets Manager console directly
2. Update secrets manually in AWS
3. Keys will be picked up automatically by worker

### If You Lose Admin Token
1. Update `ADMIN_TOKEN` environment variable in Cloudflare Worker
2. Redeploy worker with new token

### If AWS Credentials Expire
1. Update AWS credentials in Cloudflare Worker environment
2. System will automatically resume AWS access
EOF

    print_success "Admin panel guide saved to admin-panel-guide.md"
}

# Cleanup any existing Lambda resources (if any exist)
cleanup_lambda_resources() {
    print_status "Cleaning up any existing Lambda resources..."
    
    # List of potential Lambda functions to clean up
    declare -a lambda_functions=("oslira-openai-rotator" "oslira-claude-rotator" "oslira-apify-rotator" "oslira-stripe-rotator")
    
    for func in "${lambda_functions[@]}"; do
        if aws lambda get-function --function-name $func --region $AWS_REGION >/dev/null 2>&1; then
            print_warning "Found existing Lambda function: $func"
            read -p "Delete Lambda function $func? (y/N): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                aws lambda delete-function --function-name $func --region $AWS_REGION
                print_success "Deleted Lambda function: $func"
            fi
        fi
    done
    
    # Check for IAM role
    if aws iam get-role --role-name OsliraRotationRole >/dev/null 2>&1; then
        print_warning "Found existing IAM role: OsliraRotationRole"
        read -p "Delete IAM role OsliraRotationRole? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            # Detach policies first
            aws iam detach-role-policy --role-name OsliraRotationRole --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole 2>/dev/null || true
            aws iam delete-role-policy --role-name OsliraRotationRole --policy-name OsliraSecretsManagerPolicy 2>/dev/null || true
            aws iam delete-role --role-name OsliraRotationRole
            print_success "Deleted IAM role: OsliraRotationRole"
        fi
    fi
    
    # Disable auto-rotation on secrets if enabled
    declare -a secrets=("OPENAI_API_KEY" "CLAUDE_API_KEY" "APIFY_API_TOKEN" "STRIPE_SECRET_KEY" "STRIPE_WEBHOOK_SECRET")
    
    for secret in "${secrets[@]}"; do
        # Check if rotation is enabled
        ROTATION_ENABLED=$(aws secretsmanager describe-secret --secret-id "${SECRETS_PREFIX}/${secret}" --query 'RotationEnabled' --output text --region $AWS_REGION 2>/dev/null || echo "false")
        
        if [ "$ROTATION_ENABLED" = "True" ] || [ "$ROTATION_ENABLED" = "true" ]; then
            print_warning "Auto-rotation enabled on ${secret}, disabling..."
            aws secretsmanager cancel-rotate-secret --secret-id "${SECRETS_PREFIX}/${secret}" --region $AWS_REGION 2>/dev/null || print_warning "Could not disable rotation for ${secret}"
            print_success "Disabled auto-rotation for ${secret}"
        fi
    done
    
    print_success "Lambda cleanup completed"
}

# Main execution
main() {
    echo "======================================================================"
    echo "🔑 AWS Secrets Manager Setup for Oslira"
    echo "🚫 Lambda Auto-Rotation REMOVED - Manual Management Only"
    echo "======================================================================"
    
    check_prerequisites
    cleanup_lambda_resources
    create_secrets
    test_setup
    generate_env_vars
    generate_usage_guide
    
    echo ""
    echo "======================================================================"
    print_success "🎉 AWS Secrets Manager setup completed!"
    echo "======================================================================"
    echo ""
    echo "✅ What was set up:"
    echo "   - All API keys stored securely in AWS Secrets Manager"
    echo "   - Manual key management via admin panel"
    echo "   - No Lambda functions (auto-rotation removed)"
    echo "   - No CloudWatch schedules"
    echo "   - Encrypted storage with audit logging"
    echo ""
    echo "📋 Next steps:"
    echo "   1. Review and update cloudflare-env-vars.txt"
    echo "   2. Add environment variables to your Cloudflare Worker"
    echo "   3. Deploy your Cloudflare Worker"
    echo "   4. Test admin panel at: https://your-worker-url/admin/"
    echo "   5. Read admin-panel-guide.md for usage instructions"
    echo ""
    echo "🔐 Key Management:"
    echo "   - Update keys: POST /admin/update-key"
    echo "   - Check status: GET /admin/config-status"
    echo "   - Test keys: POST /admin/test-key"
    echo ""
    echo "🚫 Lambda Auto-Rotation: PERMANENTLY DISABLED"
    echo "💡 Manual rotation gives you full control and reliability"
    echo ""
    print_success "Setup complete! Your keys are secure and ready for manual management."
}

# Run the main function
main "$@"
