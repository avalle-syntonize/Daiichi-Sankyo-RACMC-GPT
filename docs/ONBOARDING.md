# Onboarding Guide - RACMC-GPT

## 👋 Welcome!

This guide will help you get up to speed with the RACMC-GPT project as quickly as possible. Whether you're a new developer joining the team or a returning developer after some time away, this document has everything you need.

---

## 📚 Required Reading

Before diving into code, please read these documents in order:

1. **[README.md](../README.md)** - Project overview and quick start (15 min)
2. **[MIGRATION.md](./MIGRATION.md)** - Understand why we use Next.js (20 min)
3. **[architecture.md](./architecture.md)** - System architecture deep dive (30 min)
4. **[AUTHENTICATION.md](./AUTHENTICATION.md)** - Auth flows and security (20 min)
5. **[COMPLIANCE.md](./COMPLIANCE.md)** - Regulatory requirements (15 min)

**Total reading time**: ~1.5 hours

---

## 🛠️ Development Environment Setup

### Prerequisites Checklist

Before starting, ensure you have:

- [ ] **Node.js 18+** - [Download](https://nodejs.org/)
- [ ] **npm 9+** - Comes with Node.js
- [ ] **Git** - [Download](https://git-scm.com/)
- [ ] **VS Code** (recommended) - [Download](https://code.visualstudio.com/)
- [ ] **Azure CLI** - [Download](https://docs.microsoft.com/cli/azure/install-azure-cli)
- [ ] **Docker Desktop** (optional) - [Download](https://www.docker.com/products/docker-desktop)

### VS Code Extensions (Recommended)

Install these extensions for the best developer experience:

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "ms-azuretools.vscode-azurestaticwebapps",
    "ms-vscode.azurecli",
    "GitHub.copilot",
    "GitHub.copilot-chat"
  ]
}
```

### Initial Setup

#### 1. Clone the Repository

```bash
# Clone via SSH (recommended)
git clone git@github.com:avalle-syntonize/Daiichi-Sankyo-RACMC-GPT.git

# Or via HTTPS
git clone https://github.com/avalle-syntonize/Daiichi-Sankyo-RACMC-GPT.git

cd Daiichi-Sankyo-RACMC-GPT
```

#### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm ci

# Create environment file
cp .env.example .env.local

# Edit .env.local with your Azure AD credentials
# Ask your team lead for development credentials
```

**Your `.env.local` should look like:**

```env
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-here-min-32-chars

# Azure AD (Entra ID) - Ask team lead for these
AZURE_AD_CLIENT_ID=xxxx-xxxx-xxxx-xxxx
AZURE_AD_CLIENT_SECRET=xxxx-xxxx-xxxx-xxxx
AZURE_AD_TENANT_ID=xxxx-xxxx-xxxx-xxxx

# Backend API
NEXT_PUBLIC_API_URL=http://localhost:8000
```

**Generate NEXTAUTH_SECRET:**

```bash
openssl rand -base64 32
```

#### 3. Backend Setup (Optional for Frontend Development)

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env

# Edit .env with your Azure credentials
```

#### 4. Verify Setup

```bash
# Frontend
cd frontend
npm run dev
# Should open http://localhost:3000

# Backend (in another terminal)
cd backend
uvicorn app.main:app --reload
# Should open http://localhost:8000
```

---

## 🏗️ Project Structure

### High-Level Overview

```
Daiichi-Sankyo-RACMC-GPT/
├── frontend/          # Next.js 15 application
├── backend/           # FastAPI backend (future)
├── infra/            # Terraform IaC
├── docs/             # Documentation
└── .github/          # GitHub Actions workflows
```

### Frontend Structure (Next.js)

```
frontend/
├── src/
│   ├── app/                    # App Router
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Home/Login page
│   │   ├── (auth)/             # Auth routes group
│   │   │   ├── error/
│   │   │   └── signout/
│   │   ├── chatbot/            # Main chatbot page
│   │   │   └── page.tsx
│   │   ├── home/               # Home dashboard
│   │   │   └── page.tsx
│   │   └── api/                # API Routes (BFF)
│   │       ├── auth/[...nextauth]/
│   │       │   └── route.ts    # NextAuth handler
│   │       └── storage/
│   │           └── token/
│   │               └── route.ts
│   │
│   ├── auth.config.ts          # NextAuth configuration
│   ├── components/             # React components
│   │   ├── ui/                 # Shadcn/ui components
│   │   ├── pages/              # Page-specific components
│   │   ├── app-sidebar.tsx
│   │   └── ...
│   │
│   ├── services/               # API services
│   │   ├── server/             # Server-side services
│   │   └── client/             # Client-side services
│   │
│   ├── dtos/                   # TypeScript interfaces
│   ├── commons/                # Utility functions
│   └── constants/              # Constants
│
├── public/                     # Static assets
├── .env.local                  # Local environment (DO NOT COMMIT)
├── next.config.ts              # Next.js configuration
├── tailwind.config.ts          # Tailwind CSS configuration
├── tsconfig.json               # TypeScript configuration
└── package.json                # Dependencies
```

---

## 🚀 Common Development Tasks

### Running the Development Server

```bash
cd frontend
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

### Building for Production

```bash
cd frontend
npm run build
npm start  # Test production build locally
```

### Linting and Formatting

```bash
# Run linter
npm run lint

# Fix linting issues
npm run lint -- --fix
```

### Type Checking

```bash
# TypeScript type check
npx tsc --noEmit
```

### Working with Components

#### Creating a Server Component (Default)

```tsx
// app/my-page/page.tsx
import { getSession } from '@/auth.config';

export default async function MyPage() {
  const session = await getSession();
  
  if (!session) {
    redirect('/');
  }
  
  return (
    <div>
      <h1>Hello, {session.user.name}</h1>
    </div>
  );
}
```

#### Creating a Client Component

```tsx
// components/MyInteractiveComponent.tsx
'use client'  // This directive is required!

import { useState } from 'react';

export function MyInteractiveComponent() {
  const [count, setCount] = useState(0);
  
  return (
    <button onClick={() => setCount(c => c + 1)}>
      Count: {count}
    </button>
  );
}
```

### Working with Authentication

#### Protecting a Page

```tsx
// app/protected-page/page.tsx
import { getSession } from '@/auth.config';
import { redirect } from 'next/navigation';

export default async function ProtectedPage() {
  const session = await getSession();
  
  if (!session) {
    redirect('/');
  }
  
  return <div>Protected content</div>;
}
```

#### Using Session in Client Components

```tsx
'use client'
import { useSession } from 'next-auth/react';

export function UserMenu() {
  const { data: session, status } = useSession();
  
  if (status === 'loading') return <div>Loading...</div>;
  if (!session) return null;
  
  return <div>Welcome, {session.user.name}</div>;
}
```

### Making API Calls

#### From Server Component

```tsx
// app/dashboard/page.tsx
async function getData() {
  const session = await getSession();
  
  const res = await fetch('http://localhost:8000/api/data', {
    headers: {
      'Authorization': `Bearer ${session.accessToken}`
    }
  });
  
  return res.json();
}

export default async function Dashboard() {
  const data = await getData();
  
  return <div>{/* Render data */}</div>;
}
```

#### From Client Component

```tsx
'use client'
import { useEffect, useState } from 'react';

export function DataDisplay() {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    fetch('/api/my-bff-endpoint')
      .then(res => res.json())
      .then(setData);
  }, []);
  
  return <div>{/* Render data */}</div>;
}
```

---

## 🧪 Testing

### Running Tests

```bash
# Unit tests (when available)
npm test

# E2E tests with Playwright (when available)
npm run test:e2e
```

### Writing Tests

```tsx
// Example: Component test
import { render, screen } from '@testing-library/react';
import MyComponent from './MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

---

## 🔍 Debugging

### VS Code Launch Configuration

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Next.js: debug server-side",
      "type": "node-terminal",
      "request": "launch",
      "command": "npm run dev"
    },
    {
      "name": "Next.js: debug client-side",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:3000"
    }
  ]
}
```

### Console Logging

```tsx
// Server Component - logs appear in terminal
export default async function ServerPage() {
  console.log('This logs in the server terminal');
  return <div>Page</div>;
}

// Client Component - logs appear in browser console
'use client'
export function ClientComponent() {
  console.log('This logs in the browser console');
  return <div>Component</div>;
}
```

### Using React DevTools

1. Install [React Developer Tools](https://react.dev/learn/react-developer-tools)
2. Open browser DevTools
3. Navigate to "Components" or "Profiler" tab

---

## 🌊 Git Workflow

### Branch Naming Convention

```
feature/your-feature-name
bugfix/issue-description
hotfix/critical-fix
docs/documentation-update
```

### Typical Workflow

```bash
# 1. Create a new branch
git checkout -b feature/my-new-feature

# 2. Make changes and commit frequently
git add .
git commit -m "feat: add new feature"

# 3. Push to remote
git push origin feature/my-new-feature

# 4. Create Pull Request on GitHub
# 5. Wait for review and approval
# 6. Merge to develop
```

### Commit Message Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add user profile page
fix: resolve authentication bug
docs: update API documentation
style: format code with prettier
refactor: restructure auth logic
test: add unit tests for auth
chore: update dependencies
```

---

## 📦 Deployment

### Development Environment

Automatic deployment on push to `develop` branch via GitHub Actions.

**URL**: `https://racmc-dev.azurestaticapps.net`

### Staging Environment

Automatic deployment on push to `staging` branch.

**URL**: `https://racmc-staging.azurestaticapps.net`

### Production Environment

Manual approval required for deployment to `main` branch.

**URL**: `https://racmc-gpt.daiichi-sankyo.eu` (future)

### Manual Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.

---

## 🆘 Common Issues & Solutions

### Issue: "Module not found" Error

**Solution:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Issue: Port 3000 Already in Use

**Solution:**
```bash
# Find and kill process using port 3000
# On macOS/Linux:
lsof -ti:3000 | xargs kill -9

# On Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Or run on different port
PORT=3001 npm run dev
```

### Issue: Authentication Not Working

**Checklist:**
- [ ] Verify `NEXTAUTH_URL` matches current URL
- [ ] Check `NEXTAUTH_SECRET` is set and at least 32 characters
- [ ] Verify Azure AD credentials are correct
- [ ] Ensure redirect URI is configured in Azure AD
- [ ] Clear browser cookies and try again

### Issue: TypeScript Errors

**Solution:**
```bash
# Restart TypeScript server in VS Code
# Press: Cmd+Shift+P (Mac) or Ctrl+Shift+P (Windows)
# Type: "TypeScript: Restart TS Server"

# Or run type check
npx tsc --noEmit
```

---

## 📖 Learning Resources

### Next.js
- [Next.js Documentation](https://nextjs.org/docs)
- [Next.js Learn Course](https://nextjs.org/learn)
- [Server Components vs Client Components](https://nextjs.org/docs/app/building-your-application/rendering/composition-patterns)

### NextAuth.js
- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Azure AD Provider Guide](https://next-auth.js.org/providers/azure-ad)

### TypeScript
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [TypeScript with Next.js](https://nextjs.org/docs/app/building-your-application/configuring/typescript)

### Tailwind CSS
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Tailwind with Next.js](https://tailwindcss.com/docs/guides/nextjs)

### Shadcn/ui
- [Shadcn/ui Documentation](https://ui.shadcn.com/)
- [Component Examples](https://ui.shadcn.com/examples)

---

## 👥 Team & Communication

### Key Contacts

| Role | Name | Contact |
|------|------|---------|
| **Tech Lead** | avalle-syntonize | GitHub: @avalle-syntonize |
| **Client Contact** | Daiichi Sankyo RACMC Team | Via project manager |
| **DevOps** | Syntonize DevOps | devops@syntonize.com |

### Communication Channels

- **GitHub Issues**: Technical discussions and bug reports
- **Pull Requests**: Code reviews and discussions
- **Project Board**: [GitHub Projects](https://github.com/users/avalle-syntonize/projects/5)

### Getting Help

1. **Check documentation**: Most answers are in the docs
2. **Search GitHub Issues**: Someone might have had the same problem
3. **Ask in PR comments**: Tag relevant people
4. **Create an issue**: For bugs or feature requests

---

## ✅ Onboarding Checklist

Before you start coding, ensure you've completed:

- [ ] Read all required documentation
- [ ] Set up development environment
- [ ] Cloned repository and installed dependencies
- [ ] Created `.env.local` with proper credentials
- [ ] Successfully ran `npm run dev` and accessed http://localhost:3000
- [ ] Authenticated with Azure AD in local environment
- [ ] Understand the difference between Server and Client Components
- [ ] Know how to create a branch and make a PR
- [ ] Reviewed the project structure
- [ ] Asked team lead any remaining questions

---

## 🎯 Your First Task

Ready to start? Here's a good first task:

1. **Familiarize yourself with the codebase**
   - Browse through `src/app/` directory
   - Read through key components in `src/components/`
   - Understand auth flow in `src/auth.config.ts`

2. **Make a small change**
   - Pick a "good first issue" from GitHub Issues
   - Or update documentation if you found something unclear
   - Submit a PR for review

3. **Get feedback**
   - Request review from team lead
   - Address feedback
   - Celebrate your first merged PR! 🎉

---

## 📝 Keeping Documentation Updated

As you work on the project, if you find:
- Missing information in docs
- Outdated instructions
- Confusing explanations

**Please update the documentation!** Good documentation benefits everyone.

---

**Welcome to the team! Happy coding! 🚀**

---

**Last updated**: January 2026  
**Maintained by**: Syntonize Development Team
