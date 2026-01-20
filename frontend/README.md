# RACMC-GPT Frontend

React + TypeScript + Vite application for the RACMC-GPT project.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm 8+

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Edit .env with your Azure Entra ID credentials
```

### Development

```bash
# Start development server with hot reload
npm run dev
```

Application will be available at `http://localhost:5173`

### Build

```bash
# Production build
npm run build

# Preview production build
npm run preview
```

### Code Quality

```bash
# Run ESLint
npm run lint

# Format code with Prettier
npm run format

# Check formatting
npm run format:check
```

## 📁 Project Structure

```
frontend/
├── src/
│   ├── components/     # Reusable UI components
│   ├── pages/          # Page components for routing
│   ├── auth/           # Authentication logic & MSAL configuration
│   ├── services/       # API services & data fetching
│   └── utils/          # Utility functions & helpers
├── public/             # Static assets
├── .env.example        # Environment variables template
└── vite.config.ts      # Vite configuration
```

## 🛠️ Tech Stack

- **React 19** - UI library
- **TypeScript 5** - Type safety
- **Vite 7** - Build tool & dev server
- **React Router Dom 7** - Client-side routing
- **MSAL React** - Azure Entra ID authentication
- **ESLint** - Code linting
- **Prettier** - Code formatting

## 🔐 Environment Variables

Copy `.env.example` to `.env` and configure:

```env
VITE_AZURE_CLIENT_ID=your_client_id_here
VITE_AZURE_TENANT_ID=your_tenant_id_here
VITE_AZURE_REDIRECT_URI=http://localhost:5173
VITE_API_BASE_URL=http://localhost:8000/api
VITE_ENVIRONMENT=development
```

## 📝 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Check code formatting |

## 🔥 Features

- ⚡ **Hot Module Replacement (HMR)** - Instant updates during development
- 📦 **Optimized builds** - Fast production builds with code splitting
- 🎨 **ESLint + Prettier** - Consistent code style
- 🔒 **Azure Entra ID** - Secure authentication via MSAL
- 🗺️ **React Router** - Client-side routing
- 📱 **TypeScript** - Type-safe development

## 🧪 Development Notes

- Hot reload is enabled by default in development mode
- ESLint is configured with React + TypeScript rules
- Prettier is integrated with ESLint for automatic formatting
- All environment variables must be prefixed with `VITE_` to be exposed to the client

---

**Project**: RACMC-GPT  
**Client**: Daiichi Sankyo Europe  
**Status**: In Development 🚧

