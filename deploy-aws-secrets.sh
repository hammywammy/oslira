#!/bin/bash
# deploy-aws-secrets.sh - AWS Secrets Manager setup (Manual rotation only)

set -e

echo "🚀 Setting up AWS Secrets Manager for Oslira (Manual Rotation)"

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

# Create IAM role for accessing secrets
create_iam_role() {
    print_status "Creating IAM role for Oslira Workers..."
    
    TRUST_POLICY='{
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": {
                    "AWS": "'$(aws sts get-caller-identity --query Arn --output text)'"
                },
                "Action": "sts:AssumeRole"
            }
        ]
    }'
    
    # Create role for Cloudflare Workers access
    aws iam create-role \
        --role-name OsliraSecretsAccessRole \
        --assume-role-policy-document "$TRUST_POLICY" \
        --description "Role for Oslira Cloudflare Workers to access secrets" \
        2>/dev/null || print_warning "Role might already exist"
    
    # Create policy for Secrets Manager access
    SECRETS_POLICY='{
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Action": [
                    "secretsmanager:GetSecretValue",
                    "secretsmanager:DescribeSecret",
                    "secretsmanager:ListSecrets"
                ],
                "Resource": "arn:aws:secretsmanager:*:*:secret:Oslira/*"
            }
        ]
    }'
    
    aws iam put-role-policy \
        --role-name OsliraSecretsAccessRole \
        --policy-name OsliraSecretsManagerPolicy \
        --policy-document "$SECRETS_POLICY"
    
    print_success "IAM role created: OsliraSecretsAccessRole"
}

# Create secrets in AWS Secrets Manager
create_secrets() {
    print_status "Creating secrets in AWS Secrets Manager..."
    
    # Get current environment variables
    read -p "Enter current OpenAI API key (or press Enter to skip): " -s OPENAI_KEY
    echo
    read -p "Enter current Anthropic API key (or press Enter to skip): " -s ANTHROPIC_KEY
    echo
    read -p "Enter current Apify API token (or press Enter to skip): " -s APIFY_TOKEN
    echo
    read -p "Enter current Stripe secret key (or press Enter to skip): " -s STRIPE_SECRET
    echo
    read -p "Enter current Stripe webhook secret (or press Enter to skip): " -s STRIPE_WEBHOOK
    echo
    
    # Create OpenAI secret
    if [ ! -z "$OPENAI_KEY" ]; then
        aws secretsmanager create-secret \
            --name "${SECRETS_PREFIX}/OPENAI_API_KEY" \
            --description "Oslira OpenAI API Key" \
            --secret-string "{\"apiKey\":\"$OPENAI_KEY\",\"createdAt\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"version\":\"v1\"}" \
            --region $AWS_REGION 2>/dev/null || print_warning "OpenAI secret might already exist"
        print_success "OpenAI API key stored in AWS Secrets Manager"
    fi
    
    # Create Anthropic secret
    if [ ! -z "$ANTHROPIC_KEY" ]; then
        aws secretsmanager create-secret \
            --name "${SECRETS_PREFIX}/ANTHROPIC_API_KEY" \
            --description "Oslira Anthropic API Key" \
            --secret-string "{\"apiKey\":\"$ANTHROPIC_KEY\",\"createdAt\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"version\":\"v1\"}" \
            --region $AWS_REGION 2>/dev/null || print_warning "Anthropic secret might already exist"
        print_success "Anthropic API key stored in AWS Secrets Manager"
    fi
    
    # Create Apify secret
    if [ ! -z "$APIFY_TOKEN" ]; then
        aws secretsmanager create-secret \
            --name "${SECRETS_PREFIX}/APIFY_API_TOKEN" \
            --description "Oslira Apify API Token" \
            --secret-string "{\"apiKey\":\"$APIFY_TOKEN\",\"createdAt\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"version\":\"v1\"}" \
            --region $AWS_REGION 2>/dev/null || print_warning "Apify secret might already exist"
        print_success "Apify API token stored in AWS Secrets Manager"
    fi
    
    # Create Stripe secret
    if [ ! -z "$STRIPE_SECRET" ]; then
        aws secretsmanager create-secret \
            --name "${SECRETS_PREFIX}/STRIPE_SECRET_KEY" \
            --description "Oslira Stripe Secret Key" \
            --secret-string "{\"apiKey\":\"$STRIPE_SECRET\",\"createdAt\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"version\":\"v1\"}" \
            --region $AWS_REGION 2>/dev/null || print_warning "Stripe secret key might already exist"
        print_success "Stripe secret key stored in AWS Secrets Manager"
    fi
    
    # Create Stripe webhook secret
    if [ ! -z "$STRIPE_WEBHOOK" ]; then
        aws secretsmanager create-secret \
            --name "${SECRETS_PREFIX}/STRIPE_WEBHOOK_SECRET" \
            --description "Oslira Stripe Webhook Secret" \
            --secret-string "{\"apiKey\":\"$STRIPE_WEBHOOK\",\"createdAt\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"version\":\"v1\"}" \
            --region $AWS_REGION 2>/dev/null || print_warning "Stripe webhook secret might already exist"
        print_success "Stripe webhook secret stored in AWS Secrets Manager"
    fi
}

# Test the setup
test_setup() {
    print_status "Testing the setup..."
    
    # Test secret retrieval for each created secret
    SECRETS=(
        "${SECRETS_PREFIX}/OPENAI_API_KEY"
        "${SECRETS_PREFIX}/ANTHROPIC_API_KEY"
        "${SECRETS_PREFIX}/APIFY_API_TOKEN"
        "${SECRETS_PREFIX}/STRIPE_SECRET_KEY"
        "${SECRETS_PREFIX}/STRIPE_WEBHOOK_SECRET"
    )
    
    SUCCESSFUL_TESTS=0
    
    for SECRET in "${SECRETS[@]}"; do
        SECRET_VALUE=$(aws secretsmanager get-secret-value \
            --secret-id "$SECRET" \
            --query SecretString \
            --output text \
            --region $AWS_REGION 2>/dev/null)
        
        if [ $? -eq 0 ]; then
            print_success "✓ Secret retrieval test passed: $SECRET"
            ((SUCCESSFUL_TESTS++))
        else
            print_warning "⚠ Secret not found (might not have been created): $SECRET"
        fi
    done
    
    if [ $SUCCESSFUL_TESTS -gt 0 ]; then
        print_success "AWS Secrets Manager setup is working ($SUCCESSFUL_TESTS secrets accessible)"
    else
        print_error "No secrets were successfully created or accessible"
        exit 1
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

# Optional: Manual rotation triggers (implement as needed)
MANUAL_ROTATION_ENABLED=true

# Optional: Slack webhook for notifications
SLACK_WEBHOOK_URL=your-slack-webhook-url

EOF
    
    print_success "Environment variables saved to cloudflare-env-vars.txt"
    print_warning "Remember to add these to your Cloudflare Worker settings"
}

# Main execution
main() {
    echo "======================================================================"
    echo "🔑 AWS Secrets Manager Setup for Oslira (Manual Rotation Only)"
    echo "======================================================================"
    
    check_prerequisites
    create_iam_role
    sleep 5  # Wait for IAM propagation
    create_secrets
    test_setup
    generate_env_vars
    
    echo ""
    echo "======================================================================"
    print_success "🎉 AWS Secrets Manager setup completed!"
    echo "======================================================================"
    echo ""
    echo "Next steps:"
    echo "1. Add the environment variables from cloudflare-env-vars.txt to your Cloudflare Worker"
    echo "2. Deploy your updated Cloudflare Worker with proper AWS integration"
    echo "3. Test the API endpoints to verify AWS integration works"
    echo "4. Use the admin panel for manual key rotation when needed"
    echo ""
    echo "Your secrets are now:"
    echo "- 🔒 Stored securely in AWS Secrets Manager"
    echo "- 🔧 Managed manually via admin panel (no auto-rotation)"
    echo "- 🔗 Ready for integration with your Cloudflare Workers"
    echo ""
    print_warning "Note: Auto-rotation has been disabled. Use admin panel for manual key updates."
    echo ""
}

# Run the main function
main "$@"
