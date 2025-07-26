#!/bin/bash

# R2 File Explorer - Security Setup Script
# This script helps set up the required encryption keys for different environments

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to generate a secure key
generate_key() {
    if command -v openssl &> /dev/null; then
        openssl rand -base64 32
    elif command -v node &> /dev/null; then
        node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
    else
        print_error "Neither openssl nor node.js found. Please install one of them to generate secure keys."
        exit 1
    fi
}

# Function to set up secrets for an environment
setup_environment() {
    local env=$1
    
    print_info "Setting up secrets for environment: $env"
    
    # Check if wrangler is installed
    if ! command -v wrangler &> /dev/null; then
        print_error "Wrangler CLI not found. Please install it with: npm install -g wrangler"
        exit 1
    fi
    
    # Generate keys
    print_info "Generating secure keys..."
    JWT_SECRET=$(generate_key)
    CREDENTIAL_ENCRYPTION_KEY=$(generate_key)
    CREDENTIAL_ENCRYPTION_KEY_BACKUP=$(generate_key)
    
    print_success "Generated secure keys"
    
    # Set JWT secret
    print_info "Setting JWT_SECRET..."
    echo "$JWT_SECRET" | wrangler secret put JWT_SECRET --env "$env"
    print_success "JWT_SECRET set successfully"
    
    # Set primary encryption key
    print_info "Setting CREDENTIAL_ENCRYPTION_KEY..."
    echo "$CREDENTIAL_ENCRYPTION_KEY" | wrangler secret put CREDENTIAL_ENCRYPTION_KEY --env "$env"
    print_success "CREDENTIAL_ENCRYPTION_KEY set successfully"
    
    # Set backup encryption key
    print_info "Setting CREDENTIAL_ENCRYPTION_KEY_BACKUP..."
    echo "$CREDENTIAL_ENCRYPTION_KEY_BACKUP" | wrangler secret put CREDENTIAL_ENCRYPTION_KEY_BACKUP --env "$env"
    print_success "CREDENTIAL_ENCRYPTION_KEY_BACKUP set successfully"
    
    print_success "All secrets configured for environment: $env"
    
    # Save keys to a secure file for backup (optional)
    read -p "Do you want to save the generated keys to a secure backup file? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        BACKUP_FILE="secrets-backup-$env-$(date +%Y%m%d-%H%M%S).txt"
        cat > "$BACKUP_FILE" << EOF
# R2 File Explorer - Secret Keys Backup
# Environment: $env
# Generated: $(date)
# 
# ⚠️  SECURITY WARNING: Store this file securely and delete after use!
# ⚠️  Never commit this file to version control!

JWT_SECRET=$JWT_SECRET
CREDENTIAL_ENCRYPTION_KEY=$CREDENTIAL_ENCRYPTION_KEY
CREDENTIAL_ENCRYPTION_KEY_BACKUP=$CREDENTIAL_ENCRYPTION_KEY_BACKUP
EOF
        chmod 600 "$BACKUP_FILE"
        print_success "Keys saved to: $BACKUP_FILE"
        print_warning "Remember to store this file securely and delete it after backing up the keys!"
    fi
}

# Function to set up local development environment
setup_local() {
    print_info "Setting up local development environment..."
    
    # Check if .dev.vars exists
    if [ -f ".dev.vars" ]; then
        print_warning ".dev.vars file already exists"
        read -p "Do you want to overwrite it? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_info "Skipping local setup"
            return
        fi
    fi
    
    # Generate keys for local development
    print_info "Generating keys for local development..."
    JWT_SECRET=$(generate_key)
    CREDENTIAL_ENCRYPTION_KEY=$(generate_key)
    CREDENTIAL_ENCRYPTION_KEY_BACKUP=$(generate_key)
    
    # Create .dev.vars file
    cat > .dev.vars << EOF
# R2 File Explorer - Local Development Secrets
# Generated: $(date)
# 
# ⚠️  WARNING: These are for development only!
# ⚠️  Use secure random keys in production via wrangler secrets!

JWT_SECRET=$JWT_SECRET

# Credential encryption key for local development (32+ characters required for AES-256)
CREDENTIAL_ENCRYPTION_KEY=$CREDENTIAL_ENCRYPTION_KEY

# Optional backup encryption key for key rotation support
CREDENTIAL_ENCRYPTION_KEY_BACKUP=$CREDENTIAL_ENCRYPTION_KEY_BACKUP
EOF
    
    chmod 600 .dev.vars
    print_success "Local development secrets configured in .dev.vars"
}

# Main script
print_info "R2 File Explorer - Security Setup Script"
print_info "This script helps configure the required encryption keys"
echo

# Check if we're in the worker directory
if [ ! -f "wrangler.toml" ]; then
    print_error "Please run this script from the worker directory"
    exit 1
fi

# Show menu
echo "Please select an option:"
echo "1) Set up local development environment (.dev.vars)"
echo "2) Set up staging environment secrets"
echo "3) Set up production environment secrets"
echo "4) Generate a single secure key"
echo "5) Exit"
echo

read -p "Enter your choice (1-5): " choice

case $choice in
    1)
        setup_local
        ;;
    2)
        setup_environment "staging"
        ;;
    3)
        setup_environment "production"
        ;;
    4)
        print_info "Generated secure key:"
        generate_key
        ;;
    5)
        print_info "Exiting..."
        exit 0
        ;;
    *)
        print_error "Invalid choice. Please run the script again."
        exit 1
        ;;
esac

print_success "Setup completed successfully!"
print_info "Next steps:"
print_info "1. Test your configuration with: wrangler dev"
print_info "2. Deploy with: wrangler deploy --env <environment>"
print_info "3. See ../SECURITY.md for complete security documentation"
print_warning "Remember to keep your encryption keys secure and never commit them to version control!"