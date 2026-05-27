import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');


export function read_file(file_path: string, start_line: number = 0, end_line: number = 0) : string {

    try { 
        const resolvedPath = path.resolve(file_path);

        if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isFile()) {
            // Resolve file path (handles absolute or relative), converts to proper format according to OS 
            // (C:/.../..., C:\...\...)


            let content = fs.readFileSync(resolvedPath, 'utf-8');
            // Allows cross-platform line splitting
            const lines = content.split(/\r?\n/);

            let finalContent = '';
            // If no boundaries, return up to 10000 characters
            if (start_line === 0 && end_line === 0) {
                finalContent = content.length > 10000
                    ? content.slice(0, 10000) + "\n...[🔴 FILE CONTENT Truncated: showing UP TO 10000 chars]..."
                    : content;
            } else {
                // Boundaries provided: return the specified lines, up to 150 lines
                const start = Math.max(0, start_line);
                const end = end_line > 0 ? Math.min(end_line, lines.length - 1) : lines.length - 1;
                let selectedLines = lines.slice(start, end + 1);
                
                finalContent = selectedLines.length > 150
                    ? selectedLines.slice(0, 150).join('\n') + "\n...[🔴 FILE CONTENT Truncated: showing UP TO 150 lines]..."
                    : selectedLines.join('\n');
            }

            // Append resolvedPath as the last line
            finalContent = finalContent.length != 0
                ? finalContent + '\n' + resolvedPath
                : `🔴 FILE EMPTY: ${resolvedPath}`;

            return finalContent;
        } 
        else {
            // File not found or not a file
            return `🔴 FILE NOT FOUND: ${file_path}`;
        }
    }
    catch (error: any) {
        // Error reading file
        return `⚠️ ERROR OCCURRED LOOKING FOR FILE CONTENT: ${error}`;
    }
}


export function grep_codebase(search_pattern: string): string {
    try {

        // Run ripgrep from the root directory
        const output = spawnSync('rg', [search_pattern, projectRoot], { encoding: 'utf-8' });

        // catch block handles this
        if (output.error) {
            return output.error.message; 
        }
        else if (!output.stdout || output.stdout.trim().length === 0) {
            return `🔴 PATTERN NOT FOUND: ${search_pattern}`;
        }

        return output.stdout.length > 10000 ? output.stdout.slice(0, 10000) + "\n...[🔴 PATTERN CONTENT Truncated: showing UP TO 10000 chars]...": output.stdout;

    } catch (error: any) {
        
        return `⚠️ ERROR OCCURRED LOOKING FOR PATTERN: ${error}`;
    }
}


export function get_file_history(file_path: string) {

    try {
        const resolvedPath = path.resolve(file_path);

        if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isFile()) {
            const args = ['log', '-p', '-n', '3', resolvedPath];
            const output = spawnSync('git', args, { encoding:   'utf-8' });

            // catch block handles this
            if (output.error || output.stdout.trim().length === 0) {
                return "🔴 NO HISTORY AVAILABLE: file is new or untracked.";
            }

            return output.stdout.length > 10000 ? output.stdout.slice(0, 10000) + "\n...[🔴 FILE HISTORY Truncated: showing UP TO 10000 chars]...": output.stdout;
        }   
        else {
            return `🔴 FILE NOT FOUND: ${resolvedPath}`;
        }
    }
    catch (error: any) {

        return `⚠️ ERROR OCCURRED LOOKING FOR FILE HISTORY: ${error}`;
    }
}

