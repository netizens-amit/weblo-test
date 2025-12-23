# Weblo HTML - AI-Powered Website Generator

A full-stack application that generates complete websites using AI. The application features a React frontend with a NestJS backend, utilizing OpenCode AI SDK for intelligent code generation.

![License](https://img.shields.io/badge/license-UNLICENSED-red)
![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)

## 🚀 Features

- **AI-Powered Generation**: Generate complete React/Vite websites from natural language prompts
- **Real-time Preview**: Live preview using Sandpack integration
- **Code Editor**: Monaco-powered editor with syntax highlighting
- **File Management**: Complete file tree navigation and editing
- **Session Management**: Track and manage generation sessions
- **Real-time Updates**: SSE-based real-time communication

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0 (or yarn/pnpm)
- **Git** >= 2.0.0
- **PostgreSQL** (for Prisma database)

## 🏗️ Project Structure

```
weblo-html/
├── backend/                 # NestJS Backend API
│   ├── src/
│   │   ├── modules/        # Feature modules (project, session, opencode)
│   │   ├── prisma/         # Prisma service
│   │   ├── prompts/        # AI prompt templates
│   │   ├── queue/          # Bull queue for job processing
│   │   └── types/          # TypeScript type definitions
│   ├── prisma/             # Prisma schema and migrations
│   └── package.json
├── frontend/               # React + Vite Frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── store/          # Redux store
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utility libraries
│   │   └── services/       # API services
│   └── package.json
├── .gitignore              # Git ignore rules
└── README.md               # This file
```

## 🛠️ Tech Stack

### Backend
- **Framework**: NestJS 10.x
- **Database ORM**: Prisma 6.x
- **AI SDK**: OpenCode AI SDK
- **Queue**: Bull (Redis-based)
- **WebSocket**: Socket.io
- **Language**: TypeScript 5.x

### Frontend
- **Framework**: React 19.x with Vite 7.x
- **State Management**: Redux Toolkit
- **UI Components**: Radix UI
- **Code Editor**: Monaco Editor
- **Preview**: Sandpack (@codesandbox/sandpack-react)
- **Styling**: TailwindCSS 4.x
- **Language**: TypeScript 5.x

## 📥 Installation

### Clone the Repository

```bash
git clone https://github.com/netizens-amit/weblo-test.git
cd weblo-test
```

### Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Start development server
npm run start:dev
```

### Frontend Setup

```bash
# Navigate to frontend directory (from project root)
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

## ⚙️ Environment Variables

### Backend (.env)

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/weblo?schema=public"

# OpenCode AI
OPENCODE_API_KEY="your-opencode-api-key"

# Server
PORT=3000

# Redis (for Bull Queue)
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Frontend

The frontend connects to the backend API at `http://localhost:3000` by default. Modify `vite.config.ts` to change the proxy settings.

## 🚀 Running the Application

### Development Mode

**Backend:**
```bash
cd backend
npm run start:dev
```

**Frontend:**
```bash
cd frontend
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

### Production Build

**Backend:**
```bash
cd backend
npm run build
npm run start:prod
```

**Frontend:**
```bash
cd frontend
npm run build
npm run preview
```

## 📝 Available Scripts

### Backend Scripts

| Script | Description |
|--------|-------------|
| `npm run start:dev` | Start development server with hot-reload |
| `npm run start:debug` | Start with debug mode |
| `npm run build` | Build for production |
| `npm run start:prod` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |
| `npm run test` | Run unit tests |
| `npm run test:e2e` | Run end-to-end tests |

### Frontend Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

## 🔗 API Endpoints

### Projects
- `GET /projects` - List all projects
- `POST /projects` - Create a new project
- `GET /projects/:id` - Get project details
- `PUT /projects/:id` - Update project
- `DELETE /projects/:id` - Delete project

### Sessions
- `GET /sessions/:projectId` - List sessions for a project
- `POST /sessions` - Create a new session

### Conversations
- `GET /conversations/:sessionId` - Get conversation history
- `POST /conversations` - Add message to conversation

### Generation
- `POST /opencode/generate` - Start AI code generation
- `GET /sse/:sessionId` - SSE endpoint for real-time updates

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is UNLICENSED - see the LICENSE file for details.

## 👨‍💻 Author

- **Amit** - [netizens-amit](https://github.com/netizens-amit)

---

## 📖 Git Commands Reference

See [GIT_COMMANDS.md](./GIT_COMMANDS.md) for detailed Git workflow documentation.
