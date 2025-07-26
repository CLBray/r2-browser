# Security Files Reference

This document shows the relationship between all security-related files in the R2 File Explorer project.

## 📋 Single Source of Truth

**[SECURITY.md](SECURITY.md)** - Complete security documentation
- All setup instructions
- Security best practices  
- Troubleshooting guide
- Emergency procedures

## 🔧 Setup Tools

**[worker/scripts/setup-secrets.sh](worker/scripts/setup-secrets.sh)** - Linux/macOS setup script
**[worker/scripts/setup-secrets.ps1](worker/scripts/setup-secrets.ps1)** - Windows PowerShell setup script

## ⚙️ Configuration Files

**[worker/.dev.vars.example](worker/.dev.vars.example)** - Template for local development
**[worker/.dev.vars](worker/.dev.vars)** - Local development secrets (auto-generated)
**[worker/wrangler.toml](worker/wrangler.toml)** - Cloudflare Worker configuration

## 📖 Documentation

**[README.md](README.md)** - Main project docs (references SECURITY.md)
**[worker/ENCRYPTION_SETUP.md](worker/ENCRYPTION_SETUP.md)** - Quick reference (redirects to SECURITY.md)

## 🔄 Maintenance

When updating security information:

1. ✅ **Update [SECURITY.md](SECURITY.md)** - The authoritative source
2. ❌ **Don't duplicate** - Other files should reference SECURITY.md
3. ✅ **Cross-reference** - Ensure all files point to SECURITY.md
4. ✅ **Test scripts** - Verify setup scripts work correctly

## 🎯 Quick Actions

```bash
# Complete security setup
cd worker && ./scripts/setup-secrets.sh

# Read full documentation  
open ../SECURITY.md

# Generate a key
npm run generate:key

# Test encryption
npm test -- credential-encryption.test.ts
```

---

**This approach ensures security instructions stay consistent and up-to-date across the entire project.**