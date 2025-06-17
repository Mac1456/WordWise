# WordWise - Document Management for Students

**Write with confidence. Organize with ease.**

WordWise is a document management platform specifically designed for high school students crafting personal statements. This version provides essential writing tools and organization features to help students manage their college application essays.

## 🚀 MVP Features

### Core Functionality
1. **Document Organization** - Keep all essays organized in one place
2. **Progress Tracking** - Monitor word counts and completion status
3. **Auto-Save** - Never lose your work with automatic saving
4. **Clean Interface** - Distraction-free writing environment
5. **Word Limit Management** - Stay within college application limits
6. **Multiple Essay Types** - Support for various essay formats

### Core Features
- **Document Management** - Create, save, edit, and organize personal statements
- **Writing Statistics** - Word count, character count, and progress tracking
- **Auto-Save Functionality** - Automatic saving as you type
- **Clean Writing Interface** - Focus on content without distractions

## 🛠️ Technology Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Storage**: LocalStorage (for MVP)
- **Icons**: Lucide React

## 📋 Prerequisites

Before you begin, ensure you have:
- **Node.js** (version 18 or higher)
- **npm** or **yarn**
- **Git**

## 🚀 Getting Started

### 1. Install Node.js
Download and install Node.js from [nodejs.org](https://nodejs.org/)

### 2. Clone the Repository
```bash
git clone <your-repository-url>
cd WordWise
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Start Development Server
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## 🔧 Build for Production

```bash
npm run build
npm run preview
```

## 📱 Usage

### For Students
1. **Sign Up** - Create your account (stored locally)
2. **Create Document** - Start a new personal statement
3. **Write & Get Feedback** - Write while receiving basic writing suggestions
4. **Analyze Tone** - Use the tone analysis feature for basic tone feedback
5. **Apply Suggestions** - Click to apply grammar and style improvements
6. **Track Progress** - Monitor word count and writing progress

### Key Features in Action
- **Basic Suggestions**: See highlighted text with improvement suggestions
- **Tone Analysis**: Get basic tone and authenticity feedback
- **Writing Stats**: Monitor word count, readability, and progress
- **Goal Alignment**: Get suggestions focused on personal statement writing
- **Educational**: Click suggestions to see explanations

## 🎯 Target User: High School Students

WordWise MVP is designed for high school students writing personal statements with features like:
- 650-word limit tracking
- Personal statement-focused suggestions
- Educational explanations for skill building
- Basic tone analysis
- Progress tracking

## 🚀 Deployment

### Vercel (Recommended)
1. Push your code to GitHub
2. Connect your repository to Vercel
3. Deploy

### Netlify
1. Push to GitHub
2. Connect repository to Netlify
3. Deploy

## 📂 Project Structure

```
WordWise/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── Header.tsx       # Navigation header
│   │   ├── WritingEditor.tsx # Main editor component
│   │   ├── SuggestionTooltip.tsx # Suggestion popups
│   │   ├── ToneAnalysis.tsx # Tone analysis display
│   │   └── WritingStats.tsx # Writing statistics
│   ├── pages/              # Page components
│   │   ├── LandingPage.tsx # Marketing landing page
│   │   ├── LoginPage.tsx   # User authentication
│   │   ├── SignupPage.tsx  # User registration
│   │   ├── DashboardPage.tsx # Document management
│   │   └── EditorPage.tsx  # Writing interface
│   ├── stores/             # State management
│   │   ├── authStore.ts    # Authentication state (localStorage)
│   │   └── documentStore.ts # Document management (localStorage)
│   ├── lib/                # Utilities and services
│   │   └── aiService.ts    # Basic writing analysis service
│   ├── App.tsx             # Main app component
│   ├── main.tsx           # App entry point
│   └── index.css          # Global styles
├── public/                # Static assets
├── package.json           # Dependencies and scripts
├── tailwind.config.js     # Tailwind configuration
├── tsconfig.json         # TypeScript configuration
└── vite.config.ts        # Vite configuration
```

## 🔧 How It Works

### Authentication
- Simple email/password registration and login
- User data stored in localStorage for MVP
- No external authentication service required

### Document Management
- Create, edit, save, and delete personal statements
- Auto-save functionality with local storage
- Document metadata and version tracking

### Writing Analysis
- Rule-based grammar and style checking
- Pattern matching for common writing issues
- Basic tone analysis using keyword detection
- Educational explanations for each suggestion

### Suggestions Engine
The MVP includes basic suggestion types:
- **Grammar**: Capitalization, punctuation, common errors
- **Style**: Remove unnecessary words, improve clarity
- **Vocabulary**: Replace weak words with stronger alternatives
- **Tone**: Detect and suggest improvements for personal statements
- **Goal-alignment**: Personal statement-specific advice

## 📈 Future Enhancements

This MVP provides the foundation for:
- AI-powered suggestions using OpenAI API
- Advanced grammar checking
- Context-aware recommendations
- Cloud storage and sync
- Real-time collaboration
- Advanced analytics

## 🎯 Success Metrics

- ✅ All 6 user stories implemented
- ✅ Basic writing suggestions
- ✅ Grammar and style checking
- ✅ Tone analysis functionality
- ✅ Personal statement-focused feedback
- ✅ Educational explanations
- ✅ Clean, responsive UI
- ✅ User authentication and document management

## 🤝 Contributing

This is an MVP version focusing on core functionality. The codebase is designed to be easily extensible for future AI integration.

## 📄 License

This project is for educational and demonstration purposes.

---

**WordWise MVP** - Essential writing assistance for high school students crafting personal statements.