# R2 File Explorer - Security Setup Script (PowerShell)
# This script helps set up the required encryption keys for different environments

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("local", "staging", "production", "generate")]
    [string]$Environment
)

# Function to print colored output
function Write-Info {
    param([string]$Message)
    Write-Host "ℹ️  $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

# Function to generate a secure key
function Generate-SecureKey {
    try {
        # Try using .NET crypto
        $bytes = New-Object byte[] 32
        $rng = [System.Security.Cryptography.RNGCryptoServiceProvider]::Create()
        $rng.GetBytes($bytes)
        $rng.Dispose()
        return [Convert]::ToBase64String($bytes)
    }
    catch {
        # Fallback to PowerShell method
        $bytes = 1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }
        return [Convert]::ToBase64String($bytes)
    }
}

# Function to set up secrets for an environment
function Setup-Environment {
    param([string]$Env)
    
    Write-Info "Setting up secrets for environment: $Env"
    
    # Check if wrangler is available
    try {
        $null = Get-Command wrangler -ErrorAction Stop
    }
    catch {
        Write-Error "Wrangler CLI not found. Please install it with: npm install -g wrangler"
        exit 1
    }
    
    # Generate keys
    Write-Info "Generating secure keys..."
    $JwtSecret = Generate-SecureKey
    $CredentialEncryptionKey = Generate-SecureKey
    $CredentialEncryptionKeyBackup = Generate-SecureKey
    
    Write-Success "Generated secure keys"
    
    # Set JWT secret
    Write-Info "Setting JWT_SECRET..."
    $JwtSecret | wrangler secret put JWT_SECRET --env $Env
    if ($LASTEXITCODE -eq 0) {
        Write-Success "JWT_SECRET set successfully"
    } else {
        Write-Error "Failed to set JWT_SECRET"
        exit 1
    }
    
    # Set primary encryption key
    Write-Info "Setting CREDENTIAL_ENCRYPTION_KEY..."
    $CredentialEncryptionKey | wrangler secret put CREDENTIAL_ENCRYPTION_KEY --env $Env
    if ($LASTEXITCODE -eq 0) {
        Write-Success "CREDENTIAL_ENCRYPTION_KEY set successfully"
    } else {
        Write-Error "Failed to set CREDENTIAL_ENCRYPTION_KEY"
        exit 1
    }
    
    # Set backup encryption key
    Write-Info "Setting CREDENTIAL_ENCRYPTION_KEY_BACKUP..."
    $CredentialEncryptionKeyBackup | wrangler secret put CREDENTIAL_ENCRYPTION_KEY_BACKUP --env $Env
    if ($LASTEXITCODE -eq 0) {
        Write-Success "CREDENTIAL_ENCRYPTION_KEY_BACKUP set successfully"
    } else {
        Write-Error "Failed to set CREDENTIAL_ENCRYPTION_KEY_BACKUP"
        exit 1
    }
    
    Write-Success "All secrets configured for environment: $Env"
    
    # Save keys to a secure file for backup (optional)
    $response = Read-Host "Do you want to save the generated keys to a secure backup file? (y/N)"
    if ($response -match "^[Yy]$") {
        $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
        $backupFile = "secrets-backup-$Env-$timestamp.txt"
        
        $backupContent = @"
# R2 File Explorer - Secret Keys Backup
# Environment: $Env
# Generated: $(Get-Date)
# 
# ⚠️  SECURITY WARNING: Store this file securely and delete after use!
# ⚠️  Never commit this file to version control!

JWT_SECRET=$JwtSecret
CREDENTIAL_ENCRYPTION_KEY=$CredentialEncryptionKey
CREDENTIAL_ENCRYPTION_KEY_BACKUP=$CredentialEncryptionKeyBackup
"@
        
        $backupContent | Out-File -FilePath $backupFile -Encoding UTF8
        Write-Success "Keys saved to: $backupFile"
        Write-Warning "Remember to store this file securely and delete it after backing up the keys!"
    }
}

# Function to set up local development environment
function Setup-Local {
    Write-Info "Setting up local development environment..."
    
    # Check if .dev.vars exists
    if (Test-Path ".dev.vars") {
        Write-Warning ".dev.vars file already exists"
        $response = Read-Host "Do you want to overwrite it? (y/N)"
        if ($response -notmatch "^[Yy]$") {
            Write-Info "Skipping local setup"
            return
        }
    }
    
    # Generate keys for local development
    Write-Info "Generating keys for local development..."
    $JwtSecret = Generate-SecureKey
    $CredentialEncryptionKey = Generate-SecureKey
    $CredentialEncryptionKeyBackup = Generate-SecureKey
    
    # Create .dev.vars file
    $devVarsContent = @"
# R2 File Explorer - Local Development Secrets
# Generated: $(Get-Date)
# 
# ⚠️  WARNING: These are for development only!
# ⚠️  Use secure random keys in production via wrangler secrets!

JWT_SECRET=$JwtSecret

# Credential encryption key for local development (32+ characters required for AES-256)
CREDENTIAL_ENCRYPTION_KEY=$CredentialEncryptionKey

# Optional backup encryption key for key rotation support
CREDENTIAL_ENCRYPTION_KEY_BACKUP=$CredentialEncryptionKeyBackup
"@
    
    $devVarsContent | Out-File -FilePath ".dev.vars" -Encoding UTF8
    Write-Success "Local development secrets configured in .dev.vars"
}

# Main script
Write-Info "R2 File Explorer - Security Setup Script"
Write-Info "This script helps configure the required encryption keys"
Write-Host ""

# Check if we're in the worker directory
if (-not (Test-Path "wrangler.toml")) {
    Write-Error "Please run this script from the worker directory"
    exit 1
}

# If environment parameter is provided, use it directly
if ($Environment) {
    switch ($Environment) {
        "local" { Setup-Local }
        "staging" { Setup-Environment "staging" }
        "production" { Setup-Environment "production" }
        "generate" { 
            Write-Info "Generated secure key:"
            Generate-SecureKey
        }
    }
} else {
    # Show interactive menu
    Write-Host "Please select an option:"
    Write-Host "1) Set up local development environment (.dev.vars)"
    Write-Host "2) Set up staging environment secrets"
    Write-Host "3) Set up production environment secrets"
    Write-Host "4) Generate a single secure key"
    Write-Host "5) Exit"
    Write-Host ""
    
    $choice = Read-Host "Enter your choice (1-5)"
    
    switch ($choice) {
        "1" { Setup-Local }
        "2" { Setup-Environment "staging" }
        "3" { Setup-Environment "production" }
        "4" { 
            Write-Info "Generated secure key:"
            Generate-SecureKey
        }
        "5" { 
            Write-Info "Exiting..."
            exit 0
        }
        default {
            Write-Error "Invalid choice. Please run the script again."
            exit 1
        }
    }
}

Write-Success "Setup completed successfully!"
Write-Info "Next steps:"
Write-Info "1. Test your configuration with: wrangler dev"
Write-Info "2. Deploy with: wrangler deploy --env <environment>"
Write-Info "3. See ../SECURITY.md for complete security documentation"
Write-Warning "Remember to keep your encryption keys secure and never commit them to version control!"