# Code-Reviewer

AI-powered code review tool using LLMs via OpenRouter. Reviews code in two modes:
- **File mode**: `--file <filename>` - reviews a single file
- **Git mode**: `--gitmode` - reviews staged changes (`git diff --staged`)

Three LLM agents: Maintainer (maintainability), Optimizer (performance), Judge (synthesis).

## LLMs used in this application:
- **Model**: `google/gemini-2.5-pro` (via OpenRouter)
- **Provider**: OpenRouter (`https://openrouter.ai/api/v1`)

## ⚙️ Setup Instructions

Before running the application, follow these steps:

1. For this repository, create a **GitHub Codespace (Cloud)** OR clone it locally and open it with your preferred code editor (e.g. Visual Studio Code, ...).

2. **Install Node.js** (If not already installed):
   - **Windows**: Download the latest installer from [nodejs.org](https://nodejs.org/) or use: `winget install OpenJS.NodeJS.LTS`
   - **macOS**: Use Homebrew: `brew install node`
   - **Linux (Ubuntu/Debian)**: `sudo apt update && sudo apt install nodejs npm`
   - **Cloud Workspaces (Codespaces, etc.)**: Node.js is usually pre-installed. Run `node --version` to verify and skip this step.

3. **Install ripgrep** (required for `grep_codebase` tool):
   - **Windows**: `winget install BurntSushi.ripgrep.MSVC`
   - **macOS**: `brew install ripgrep`
   - **Linux (Ubuntu/Debian)**: `sudo apt install ripgrep`

4. **Install Dependencies**:
   ```sh
   npm install
   ```

5. **Environment Configuration**:
   - Create a local `.env` file by copying the template file `.env.example`. This file contains all required API keys for the application:
   ```sh
     # On Windows (Command Prompt)
     copy .env.example .env
     # On macOS/Linux or PowerShell
     cp .env.example .env
   ```
> [!IMPORTANT]
> Always **copy** the template. Do not rename `.env.example` directly, as it must remain in the repository as a reference for required environment variables.

   - Open the newly created `.env` file and fill in your `OPENROUTER_API_KEY`. The application **will not** function without a valid `.env` file in the **repository root**.

6. **Main Directories Glossary**:
   - `./src/`: Main source code (review.ts, schemas.ts, tools.ts)
   - `./src/system_prompts/`: Agent instructions (INSTRUCTIONS1-3.md)
   - `./node_modules/`: Installed npm dependencies

### 🚨 Troubleshooting
- **Missing API Key**: Ensure `OPENROUTER_API_KEY` is correctly set in your `.env` file at the repository root.
- **Dependency Issues**: If running in a new environment, ensure you have executed `npm install` (**Step 4**).
- **ripgrep not found**: Install ripgrep (**Step 3**) - required for the `grep_codebase` tool.
- **Git not found**: Required for `--gitmode` and `get_file_history` tool. Install Git if missing.
- **TypeScript errors**: Run `npx tsc --noEmit` to typecheck.

## 🚀 Usage

### File Mode
Review a single file:
```bash
npx tsx src/review.ts --file path/to/your/file.ts [--verbose]
```

### Git Mode
Review staged changes:
```bash
npx tsx src/review.ts --gitmode [--verbose]
```

### Typecheck Only
```bash
npx tsc --noEmit
```

## 📁 Project Structure
```
Code-Reviewer/
├── src/
│   ├── review.ts           # Main entry point
│   ├── schemas.ts          # Zod schemas & tool definitions
│   ├── tools.ts            # Tool implementations
│   └── system_prompts/
│       ├── INSTRUCTIONS1.md # Maintainer prompt
│       ├── INSTRUCTIONS2.md # Optimizer prompt
│       └── INSTRUCTIONS3.md # Judge prompt
├── .env.example            # Environment template
├── package.json
├── tsconfig.json
└── AGENTS.md               # Agent instructions
```