# Code-Reviewer

AI-powered code review tool using LLMs via OpenRouter. Reviews code in two modes:
- **File mode**: `--file <filename>` - reviews ANY code file from your device
- **Git mode**: `--gitmode [repoPath]` - reviews staged changes in current or any local repo

This application writes a Markdown report to `./reports/` each time is run.

## LLMs used in this application:
- [Google Gemini 2.5 Pro](https://openrouter.ai/google/gemini-2.5-pro)

Three agents used:
- Maintainer (maintainability) & Optimizer (performance) -> Parallel work 
- Senior Developer Judge -> Synthesis/Aggregation (Writes report)


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
   - `./reports/`: Generated review reports (created automatically)

### 📄 Report Output
- **File mode**: `report/report_[FILENAME].md`
- **Git mode**: `report/report_staged_#[N].md` (incrementing number)

### 🚨 Troubleshooting
- **Missing API Key**: Ensure `OPENROUTER_API_KEY` is correctly set in your `.env` file at the repository root.
- **Dependency Issues**: If running in a new environment, ensure you have executed `npm install` (**Step 4**).
- **ripgrep not found**: Install ripgrep (**Step 3**) - required for the `grep_codebase` LLM tool.
- **Git not found**: Required for `--gitmode` and `get_file_history` tool. Install Git if missing.
- **TypeScript errors**: Run `npx tsc --noEmit` to typecheck.

---

## 🚀 Usage

> [!IMPORTANT]
> All paths used as parameters should be absolute paths and wrapped in quotes for safety.

### File Mode
Review a single file:
```bash
npx tsx src/review.ts --file "path/to/your/file.ts" [--verbose]
```

> [!NOTE]
> Verbose flag (`--verbose`) generates a `debug.txt` file with log traces (overridden per run), use it for engineering purposes only.

### Git Mode

Review staged changes in a local cloned repo:
```bash
npx tsx src/review.ts --gitmode "/path/to/other/repo" [--verbose]
```

Review staged changes in current repo:
```bash
npx tsx src/review.ts --gitmode [--verbose]
```





