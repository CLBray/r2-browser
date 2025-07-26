# Security Setup

> **📖 This file has been consolidated into the main security documentation.**
> 
> **For complete security setup instructions, see [../SECURITY.md](../SECURITY.md)**

## Quick Start

```bash
# Run the automated setup script
./scripts/setup-secrets.sh

# Or use npm script
npm run setup:secrets
```

## What You Need

The R2 File Explorer requires encryption keys to secure stored credentials:

- `JWT_SECRET` - For JWT token signing
- `CREDENTIAL_ENCRYPTION_KEY` - For AES-256 credential encryption
- `CREDENTIAL_ENCRYPTION_KEY_BACKUP` - Optional, for key rotation

## Getting Help

1. **Full Documentation**: [../SECURITY.md](../SECURITY.md)
2. **Setup Script**: `./scripts/setup-secrets.sh`
3. **Generate Key**: `npm run generate:key`
4. **Test Setup**: `npm test -- credential-encryption.test.ts`

---

**✅ All detailed instructions, troubleshooting, and security best practices are in [SECURITY.md](../SECURITY.md)**