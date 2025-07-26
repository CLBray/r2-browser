# Security Configuration Guide

> **📋 This is the authoritative security documentation for R2 File Explorer**
> 
> All security setup instructions, best practices, and troubleshooting are consolidated here.

## Table of Contents

- [Overview](#overview)
- [Required Environment Variables](#required-environment-variables)
- [Setup Instructions](#setup-instructions)
  - [Quick Setup (Recommended)](#-quick-setup-recommended)
  - [Manual Setup](#️-manual-setup)
- [Security Best Practices](#security-best-practices)
- [Security Features](#security-features)
- [Troubleshooting](#troubleshooting)
- [Emergency Procedures](#emergency-procedures)
- [Security Checklist](#security-checklist)

## Overview

The R2 File Explorer implements multiple layers of security:

1. **JWT Authentication**: Secure session management
2. **Credential Encryption**: AES-256-GCM encryption of stored R2 credentials
3. **Key Management**: Secure key storage and rotation support
4. **Environment Isolation**: Separate keys for each environment

### What's New

**Security Features Added:**
- **AES-256-GCM Encryption**: All R2 credentials are encrypted before storage in KV
- **PBKDF2 Key Derivation**: Session-specific encryption keys with 100,000 iterations
- **Key Rotation Support**: Seamless key rotation without downtime
- **Secure Defaults**: System fails securely if encryption keys are missing
- **Automated Setup**: Scripts for easy and secure key configuration

## Required Environment Variables

### Critical Security Variables

| Variable | Purpose | Required | Min Length |
|----------|---------|----------|------------|
| `JWT_SECRET` | JWT token signing | Yes | 32 chars |
| `CREDENTIAL_ENCRYPTION_KEY` | Primary encryption key | Yes | 32 chars |
| `CREDENTIAL_ENCRYPTION_KEY_BACKUP` | Key rotation support | No | 32 chars |

## Setup Instructions

### 🔧 Quick Setup (Recommended)

Use the automated setup script for easy configuration:

```bash
# Navigate to worker directory
cd worker

# Run setup script (Linux/macOS)
./scripts/setup-secrets.sh

# Or for Windows PowerShell
.\scripts\setup-secrets.ps1

# Or use npm scripts
npm run setup:secrets
```

The setup script will:
- Generate cryptographically secure keys
- Configure your chosen environment (local/staging/production)
- Optionally create backup files for key storage
- Validate key requirements and security

### 🛠️ Manual Setup

#### Local Development

1. Copy the example file:
   ```bash
   cp .dev.vars.example .dev.vars
   ```

2. Generate secure keys:
   ```bash
   # Generate a secure key
   openssl rand -base64 32
   # or
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

3. Edit `.dev.vars` with your generated keys:
   ```bash
   JWT_SECRET=your_generated_jwt_secret_here
   CREDENTIAL_ENCRYPTION_KEY=your_generated_encryption_key_here
   CREDENTIAL_ENCRYPTION_KEY_BACKUP=your_generated_backup_key_here
   ```

#### Production Deployment

Set secrets using Wrangler CLI:

```bash
# Production environment
wrangler secret put JWT_SECRET --env production
wrangler secret put CREDENTIAL_ENCRYPTION_KEY --env production
wrangler secret put CREDENTIAL_ENCRYPTION_KEY_BACKUP --env production

# Staging environment
wrangler secret put JWT_SECRET --env staging
wrangler secret put CREDENTIAL_ENCRYPTION_KEY --env staging
wrangler secret put CREDENTIAL_ENCRYPTION_KEY_BACKUP --env staging
```

## Security Best Practices

### ✅ Key Generation

- **Use cryptographically secure random generators**
- **Minimum 32 characters for all keys**
- **Different keys for each environment**
- **Never reuse keys across applications**

### ✅ Key Storage

- **Never commit keys to version control**
- **Use Wrangler secrets for production**
- **Restrict access to `.dev.vars` files**
- **Store backup keys securely offline**

### ✅ Key Rotation

1. Generate new encryption key
2. Set as `CREDENTIAL_ENCRYPTION_KEY_BACKUP`
3. Deploy and verify functionality
4. Promote backup key to primary
5. Generate new backup key
6. Remove old primary key

### ✅ Environment Isolation

- **Development**: Use `.dev.vars` file
- **Staging**: Use Wrangler secrets with `--env staging`
- **Production**: Use Wrangler secrets with `--env production`

## Security Features

### 🔐 Credential Encryption

- **Algorithm**: AES-256-GCM
- **Key Derivation**: PBKDF2 with 100,000 iterations
- **Session-specific**: Each session uses unique derived keys
- **Authentication**: Built-in authentication tag verification

### 🔑 Key Management

- **Versioning**: Support for multiple key versions
- **Rotation**: Seamless key rotation without downtime
- **Fallback**: Automatic fallback to backup keys
- **Validation**: Key format and entropy validation

### 🛡️ Session Security

- **Encrypted Storage**: All credentials encrypted in KV storage
- **Session Isolation**: Each session has unique encryption context
- **Automatic Cleanup**: Failed decryption invalidates sessions
- **Secure Defaults**: Fail-secure behavior on encryption errors

## Troubleshooting

### Common Issues

#### Missing Encryption Key
```
Error: CREDENTIAL_ENCRYPTION_KEY environment variable is required
```
**Solution**: Set the encryption key using the setup script or manually

#### Key Too Short
```
Error: Encryption key must be at least 32 characters long
```
**Solution**: Generate a longer key using the recommended methods

#### Insufficient Entropy
```
Error: Encryption key must have sufficient entropy
```
**Solution**: Use a cryptographically secure random generator

### Verification Commands

```bash
# Check if secrets are set (production)
wrangler secret list --env production

# Test local configuration
wrangler dev --env development

# Generate test key
npm run generate:key

# Test encryption functionality
npm test -- credential-encryption.test.ts
```

## Emergency Procedures

### Key Compromise

1. **Immediately rotate all affected keys**
2. **Invalidate all active sessions**
3. **Review access logs**
4. **Update monitoring alerts**

### Recovery Steps

1. Generate new secure keys
2. Update all environments
3. Restart all services
4. Verify functionality
5. Monitor for issues

## Compliance Notes

- **Encryption**: AES-256-GCM meets industry standards
- **Key Management**: Follows NIST recommendations
- **Storage**: No plaintext credential storage
- **Audit**: All encryption operations are logged

## Support

For security-related questions or issues:

1. Check this documentation first
2. Review the troubleshooting section
3. Test with the setup scripts
4. Verify environment configuration

⚠️ **Never share encryption keys in support requests**

## Security Checklist

Before deploying to production:

- [ ] All required environment variables are set
- [ ] Keys are generated using secure methods
- [ ] Different keys are used for each environment
- [ ] Backup keys are stored securely
- [ ] `.dev.vars` is in `.gitignore`
- [ ] Production secrets are set via Wrangler
- [ ] Key rotation procedure is documented
- [ ] Monitoring is configured for encryption failures
- [ ] Emergency procedures are tested

## Related Files

- **Setup Scripts**: 
  - `worker/scripts/setup-secrets.sh` (Linux/macOS)
  - `worker/scripts/setup-secrets.ps1` (Windows)
- **Configuration Files**:
  - `worker/.dev.vars.example` - Template for local development
  - `worker/wrangler.toml` - Cloudflare Worker configuration
- **Documentation**:
  - `README.md` - Main project documentation
  - `worker/ENCRYPTION_SETUP.md` - Quick reference (redirects here)

## NPM Scripts

```bash
# Security-related npm scripts
npm run setup:secrets          # Run setup script
npm run generate:key           # Generate a single secure key
npm test -- credential-encryption.test.ts  # Test encryption
```

---

**📋 This is the single source of truth for security configuration**  
**🔄 Last Updated**: January 2025  
**📝 Version**: 1.0.0