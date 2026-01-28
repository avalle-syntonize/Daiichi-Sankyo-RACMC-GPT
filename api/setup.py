#!/usr/bin/env python3
"""
Setup script for local development of RACMC-GPT backend.

This script helps configure the local environment for development.
"""

import os
import sys
import json
import subprocess
from pathlib import Path


def print_header(text):
    """Print a formatted header."""
    print(f"\n{'='*60}")
    print(f"  {text}")
    print(f"{'='*60}\n")


def check_python_version():
    """Check Python version."""
    print_header("Checking Python Version")
    
    version = sys.version_info
    if version.major < 3 or (version.major == 3 and version.minor < 11):
        print(f"❌ Python 3.11+ required. Found: {version.major}.{version.minor}")
        return False
    
    print(f"✅ Python {version.major}.{version.minor}.{version.micro}")
    return True


def check_azure_tools():
    """Check for Azure tools."""
    print_header("Checking Azure Tools")
    
    tools_ok = True
    
    # Check Azure CLI
    try:
        result = subprocess.run(['az', '--version'], capture_output=True, text=True)
        if result.returncode == 0:
            print(f"✅ Azure CLI installed")
        else:
            print(f"⚠️  Azure CLI found but error: {result.stderr}")
    except FileNotFoundError:
        print(f"⚠️  Azure CLI not found (optional)")
    
    # Check Azure Functions Core Tools
    try:
        result = subprocess.run(['func', '--version'], capture_output=True, text=True)
        if result.returncode == 0:
            print(f"✅ Azure Functions Core Tools installed")
        else:
            print(f"⚠️  Functions tools found but error: {result.stderr}")
    except FileNotFoundError:
        print(f"❌ Azure Functions Core Tools not found")
        print(f"   Install from: https://github.com/Azure/azure-functions-core-tools")
        tools_ok = False
    
    return tools_ok


def setup_virtual_environment():
    """Set up Python virtual environment."""
    print_header("Setting Up Virtual Environment")
    
    venv_path = Path('venv')
    
    if venv_path.exists():
        print(f"✅ Virtual environment already exists at {venv_path}")
        return True
    
    print(f"Creating virtual environment...")
    try:
        subprocess.run([sys.executable, '-m', 'venv', 'venv'], check=True)
        print(f"✅ Virtual environment created")
        
        # Get the pip path
        if sys.platform == 'win32':
            pip_path = venv_path / 'Scripts' / 'pip'
        else:
            pip_path = venv_path / 'bin' / 'pip'
        
        print(f"\nTo activate the virtual environment:")
        if sys.platform == 'win32':
            print(f"  venv\\Scripts\\activate")
        else:
            print(f"  source venv/bin/activate")
        
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to create virtual environment: {e}")
        return False


def install_dependencies():
    """Install Python dependencies."""
    print_header("Installing Dependencies")
    
    requirements_file = Path('requirements.txt')
    
    if not requirements_file.exists():
        print(f"❌ requirements.txt not found")
        return False
    
    print(f"Installing packages from {requirements_file}...")
    
    # Get the pip path
    if sys.platform == 'win32':
        pip_cmd = [str(Path('venv') / 'Scripts' / 'pip')]
    else:
        pip_cmd = [str(Path('venv') / 'bin' / 'pip')]
    
    try:
        subprocess.run(
            pip_cmd + ['install', '-r', str(requirements_file)],
            check=True
        )
        print(f"✅ Dependencies installed")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install dependencies: {e}")
        return False


def setup_local_settings():
    """Set up local.settings.json."""
    print_header("Configuring Local Settings")
    
    settings_file = Path('local.settings.json')
    
    if settings_file.exists():
        print(f"✅ local.settings.json already exists")
        print(f"\nPlease update it with your Azure AD credentials:")
        print(f"  - AZURE_TENANT_ID: Your Azure AD tenant ID")
        print(f"  - AZURE_CLIENT_ID: Your application ID")
        return True
    
    # Create local.settings.json template
    settings = {
        "IsEncrypted": False,
        "Values": {
            "AzureWebJobsStorage": "UseDevelopmentStorage=true",
            "FUNCTIONS_WORKER_RUNTIME": "python",
            "FUNCTIONS_WORKER_RUNTIME_VERSION": "3.11"
        },
        "AzureAd": {
            "TenantId": "YOUR_TENANT_ID",
            "ClientId": "YOUR_CLIENT_ID",
            "Authority": "https://login.microsoftonline.com/YOUR_TENANT_ID"
        },
        "Security": {
            "AllowedOrigins": "https://*.azurestaticapps.net,http://localhost:5173,http://localhost:3000",
            "RequiredCustomHeader": "X-SWA-Custom-Header",
            "TokenValidationClockSkew": 300,
            "NonceExpirationSeconds": 900
        }
    }
    
    try:
        with open(settings_file, 'w') as f:
            json.dump(settings, f, indent=2)
        
        print(f"✅ local.settings.json created")
        print(f"\nNext steps:")
        print(f"  1. Open local.settings.json")
        print(f"  2. Replace YOUR_TENANT_ID with your Azure AD tenant ID")
        print(f"  3. Replace YOUR_CLIENT_ID with your Azure AD app ID")
        print(f"  4. Configure ALLOWED_ORIGINS if needed")
        return True
    except Exception as e:
        print(f"❌ Failed to create local.settings.json: {e}")
        return False


def verify_installation():
    """Verify the installation."""
    print_header("Verifying Installation")
    
    checks = [
        ("Python version", check_python_version()),
        ("Virtual environment", Path('venv').exists()),
        ("local.settings.json", Path('local.settings.json').exists()),
        ("requirements.txt", Path('requirements.txt').exists()),
        ("secure_auth module", Path('secure_auth/__init__.py').exists()),
    ]
    
    all_ok = all(check[1] for check in checks)
    
    print("\nVerification Results:")
    for name, result in checks:
        status = "✅" if result else "❌"
        print(f"  {status} {name}")
    
    return all_ok


def print_next_steps():
    """Print next steps for the user."""
    print_header("Next Steps")
    
    print("1. Activate virtual environment:")
    if sys.platform == 'win32':
        print("   venv\\Scripts\\activate")
    else:
        print("   source venv/bin/activate")
    
    print("\n2. Update local.settings.json with your Azure AD credentials")
    
    print("\n3. Run the development server:")
    print("   func start")
    
    print("\n4. Run tests:")
    print("   pytest")
    
    print("\n5. View API documentation:")
    print("   - api/README.md")
    print("   - docs/IMPLEMENTATION-SECURITY.md")
    
    print("\nThe API will be available at:")
    print("   http://localhost:7071")
    
    print("\nTest endpoint:")
    print("   GET http://localhost:7071/api/secure-test")


def main():
    """Main setup function."""
    print("\n" + "="*60)
    print("  RACMC-GPT Backend Setup")
    print("="*60)
    
    # Check Python version
    if not check_python_version():
        print("\n❌ Setup failed: Python 3.11+ required")
        sys.exit(1)
    
    # Check Azure tools
    check_azure_tools()
    
    # Set up virtual environment
    if not setup_virtual_environment():
        print("\n❌ Setup failed: Could not create virtual environment")
        sys.exit(1)
    
    # Install dependencies
    if not install_dependencies():
        print("\n❌ Setup failed: Could not install dependencies")
        sys.exit(1)
    
    # Set up local settings
    if not setup_local_settings():
        print("\n⚠️  Warning: Could not create local.settings.json")
    
    # Verify installation
    if not verify_installation():
        print("\n⚠️  Warning: Some checks failed, but setup may still work")
    
    # Print next steps
    print_next_steps()
    
    print("\n" + "="*60)
    print("  Setup Complete!")
    print("="*60 + "\n")


if __name__ == '__main__':
    main()
