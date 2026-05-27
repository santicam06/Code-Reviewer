import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';
import { read_file, grep_codebase, get_file_history } from './tools.ts';
import {read_file_tool, grep_codebase_tool, schemaLLM, file_history_tool } from './schemas.ts';     // Neither maintainer nor optimizer use file_history_tool
import { zodResponseFormat } from 'openai/helpers/zod.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });


const openai = new OpenAI({
  // Override the baseURL so that we use OpenRouter's API vs. OpenAI
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
});

// FUNCTION TEST FOR GITMODE: INTENTIONALLY BAD 
function generateHaikuTopic(seed: string): string {
  const topics = ['moonlight', 'autumn rain', 'quiet forest', 'old library', 'morning fog'];
  let hash = 0;

  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }

  return topics[hash % topics.length];
}

// FUNCTION TEST FOR GITMODE: INTENTIONALLY BAD 
function superUnsafeProcess(input: any, users: any[]): number {
  // 1) hardcoded secret
  const apiKey = "sk-live-VERY-SECRET-KEY";

  // 2) assignment in condition (logic bug)
  if (input.isAdmin = true) {
    console.log("Admin granted");
  }

  // 3) possible runtime crash: JSON.parse on non-string / invalid JSON
  const data = JSON.parse(input.payload);

  // 4) wrong type assumption, can throw if name is undefined/null
  const normalized = data.name.trim().toLowerCase();

  // 5) mutation + out-of-bounds write
  users[999999] = { hacked: true };

  // 6) divide by zero risk
  const ratio = 100 / (users.length - users.length);

  // 7) wrong return type usage (string assigned then returned as number)
  let result: number = "42" as any;

  // 8) accidental infinite loop
  let i = 0;
  while (i < 10) {
    i -= 1;
  }

  // 9) unreachable in practice because of infinite loop above
  return result + ratio + normalized;
}

async function callLLM(messages: any[], tools: any[] = [], responseFormat: any = undefined, maxRetries = 3, delay = 1000): Promise<any> {

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {    
            const requestBody: any = {
              model: 'google/gemini-2.5-pro',
              messages,
              temperature: 0.8,
            };
          
            if (responseFormat) {
              requestBody.response_format = responseFormat;
            }
          
            if (tools.length > 0) {
              requestBody.tools = tools;
              requestBody.tool_choice = 'auto';
            }
          
            const completion = await openai.chat.completions.create(requestBody);
            return completion;
        } 
        catch (error: any) {

            const msg = error?.message;
            if (
                error?.code === 'RATE_LIMITED' ||
                (typeof msg === 'string' && msg.toLowerCase().includes('rate limit'))
            ) {
                if (attempt < maxRetries) {

                    // suspends the function for 2^attempt seconds, then next loop itr
                    await new Promise(res => setTimeout(res, delay * Math.pow(2, attempt)));
                } else {
                    throw new Error('Rate limit exceeded and retries failed.');
                }
            } else {
                throw error;
            }
        }
    }

    throw new Error('LLM call failed after looping.');
}


// This function collects the whole conversation between user tools and LLM
// A reviewer can be maintainer or optimizer
async function conversationLLM(reviewer: OpenAI.Chat.Completions.ChatCompletion | undefined, verboseFlag: boolean, roleReviewer: string): Promise<any> {

  // To be joined with reviewer's inputs pack in main
  let reviewerInputPack: any[] = [];

  let reviewerMessage = reviewer?.choices?.[0]?.message;
  
    if (reviewerMessage) {
       // Add assistant's response to messages
       reviewerInputPack.push(reviewerMessage);
    }   

    if (reviewerMessage && reviewerMessage.tool_calls) {
        for (const toolCall of reviewerMessage.tool_calls) {
            if (toolCall && toolCall.type === 'function')   { 

              const functionName = toolCall.function.name;
              const args = JSON.parse(toolCall.function.arguments);
              let toolContent = ''; 

              console.log('-TOOLCALL ID: ' + toolCall.id);
              console.log('   FUNCTION CALLED: ' + JSON.stringify(toolCall.function.name) + '\n'); 

              // Verify which function is requested by LLM
              if (functionName === 'read_file') {
                if (verboseFlag) {
                  console.error(
                    `[${roleReviewer}] Calling ${functionName}(${args.file_path}, ${args.start_line}, ${args.end_line})`
                  );
                }
                toolContent = read_file(args.file_path, args.start_line, args.end_line);


                if (verboseFlag) { console.error(`[Tool: read_file] File content displayed: \n\n ${toolContent}`); }
              } 

              else if (functionName === 'grep_codebase') {
                if (verboseFlag) {
                  console.error(
                    `[${roleReviewer}] Calling ${functionName}(${args.search_pattern})`
                  );
                }
                toolContent = grep_codebase(args.search_pattern);

                if (verboseFlag) { 
                  
                  const trimmedOutput = toolContent.trim();

                  // ripgrep outputs one match per line, count non-empty lines
                  const patternOccurrences = trimmedOutput.length === 0
                    ? 0
                    : trimmedOutput.split(/\r?\n/).filter((line) => line.trim().length > 0).length;
                                 
                  console.error(
                    `[Tool: grep_codebase] Found ${patternOccurrences} matches for "${args.search_pattern}":\n\n${toolContent}`
                  );
                }
              }

              else if (functionName === 'get_file_history') {
                if (verboseFlag) {
                  console.error(
                    `[${roleReviewer}] Calling ${functionName}(${args.file_path})`
                  );
                }
                toolContent = get_file_history(args.file_path);

                if (verboseFlag) { console.error(`[Tool: get_file_history] last 3 commits displayed: \n\n ${toolContent}`); }
              } 

              const toolMessage = {
                role: 'tool',
                tool_call_id: toolCall.id,
                content: String(toolContent ?? ''),
              }; 

              // To be joined with reviewer's inputs pack in main
              reviewerInputPack.push(toolMessage);
            }
        }
    }

  // if there were no tool_calls, this will be []
  return reviewerInputPack;
}

function parseToJSON(label: string, contentLLM: string, isVerbose: boolean): any[] {
  
  try {
    // Remove markdown fences if model returns ```json ... ```
    const cleanedContent = contentLLM
      .replace(/```json\s*/gi, '')
      .replace(/```/g, '')
      .trim();

    const parsedContent = JSON.parse(cleanedContent);

    // Validate each object in array against zod schema
    const validated = schemaLLM.parse(parsedContent);
    const arrayJSONS = validated.findings;

    if (isVerbose) {
      console.error(`${label} RAW FINDINGS:\n`);
      console.error(JSON.stringify(validated, null, 2));
    }

    return arrayJSONS;
  } 
  catch {
    console.error(`${label} RAW FINDINGS (non-JSON parsed):\n`);
    console.error(contentLLM);
    return [];
  }
}

async function toolCallLoop(inputPackMaintainer: any[], inputPackOptimizer: any[], isVerbose: boolean)
: Promise<void> {

  let i = 1;
  let started = false;

    while (i <= 5) {
        console.log(`📲 LLM CALL #${i}`);

        // Call MAINTAINER & OPTIMIZER with user input + available tools
        const [maintainer, optimizer] = await Promise.all([
            callLLM(inputPackMaintainer, [read_file_tool]),
            callLLM(inputPackOptimizer, [grep_codebase_tool, read_file_tool])
        ]);

        if (!started && (maintainer && optimizer) && isVerbose) { 
          console.error(`Maintainer & Optimizer have started thinking... \n`);
          started = true;       
        }

        // Respond to tool calls and pack results by executing tools
        const [maintainerTools, optimizerTools] = await Promise.all([
          conversationLLM(maintainer, isVerbose, "Maintainer"),
          conversationLLM(optimizer, isVerbose, "Optimizer"),
        ]);

        // if neither reviewer requested tools, stop looping
        if (maintainerTools.length === 0 && optimizerTools.length === 0) {
          break;
        }

        inputPackMaintainer.push(...maintainerTools);
        inputPackOptimizer.push(...optimizerTools);
        i++;
    }
}


// Function used for reviewers only, used to produce their JSON outputs
async function finalCallLLM(inputPackMaintainer: any[], inputPackOptimizer: any[]) {

  // Provide all conversation + zod schema for output
  const [maintainerFinalCall, optimizerFinalCall] = await Promise.all([
    callLLM(inputPackMaintainer, [], zodResponseFormat(schemaLLM, 'outputFormatLLM')),
    callLLM(inputPackOptimizer, [], zodResponseFormat(schemaLLM, 'outputFormatLLM')),
  ]);

  return {
    maintainerFinalMSG: maintainerFinalCall.choices[0]?.message.content,
    optimizerFinalMSG: optimizerFinalCall.choices[0]?.message.content,
  };
}

async function main() {
    try {
        // Load system prompts 
        const instructPath1 = path.join(__dirname, 'system_prompts/INSTRUCTIONS1.md');
        const instructionsMaintainer = fs.readFileSync(instructPath1, 'utf-8');
        
        const instructPath2 = path.join(__dirname, 'system_prompts/INSTRUCTIONS2.md');
        const instructionsOptimizer = fs.readFileSync(instructPath2, 'utf-8');

        const instructPath3 = path.join(__dirname, 'system_prompts/INSTRUCTIONS3.md');
        const instructionsJudge = fs.readFileSync(instructPath3, 'utf-8');

        // Parse arguments from CLI
        const args = process.argv.slice(2);            // first two args are node(0) + review.ts(1)
        const isGitMode = args.includes('--gitmode');
        const isFileMode = args.includes('--file');
        const isVerbose = args.includes('--verbose');

        if (isGitMode && isFileMode) {
            throw new Error("Please choose only one flag: --gitmode or --file <filename>")
        }

        // REVIEWER 1: MAINTAINER MESSAGES PACK
        let inputPackMaintainer: any = [ { role: 'system', content: instructionsMaintainer }, ];
        
        // REVIEWER 2: OPTIMIZER MESSAGES PACK
        let inputPackOptimizer: any = [  { role: 'system', content: instructionsOptimizer },  ];


        // File mode logic
        let fileName: string | null = null;          // will hold a string but starts as null
        if (isFileMode) {
            
            const fileFlag = args.indexOf('--file');
            if (fileFlag !== -1 && args[fileFlag + 1]) {        // check if filename present
                fileName = args[fileFlag + 1] as string;
            }

            if (!fileName || !fs.existsSync(fileName)) {
                console.log('🔴 MAIN(): NO FILE FOUND TO REVIEW IN FILE MODE. Check file name.');
                process.exit(0);
            }

            // Proceed with file mode logic
            console.log(`Reviewing file: ${fileName}`);

            // Prepare user input (file content)
            inputPackMaintainer.push({ role: 'user', content: fileName })
            inputPackOptimizer.push({ role: 'user', content: fileName })

            // Handle LLMs conversation with tool calls, packing results in inputPacks
            await toolCallLoop(inputPackMaintainer, inputPackOptimizer, isVerbose);
            
            // FINAL LLMs CALL, FUNCTION RETURNS FINAL OUTPUT OF REVIEWERS
            const { maintainerFinalMSG, optimizerFinalMSG } = await finalCallLLM(inputPackMaintainer, inputPackOptimizer);
            
            if (maintainerFinalMSG && optimizerFinalMSG) {

              // Collect output, set into arrays of JSON + Raw findings for verbose mode
              const maintainerJSONArray = parseToJSON('🧹MAINTAINER', maintainerFinalMSG, isVerbose);
              const optimizerJSONArray = parseToJSON('⚡OPTIMIZER', optimizerFinalMSG, isVerbose);

              const arrayJSONPack = maintainerJSONArray.concat(optimizerJSONArray);

              const inputPackJudge: any = [  { role: 'system', content: instructionsJudge },  
                                             { role: 'user', content: `Here are the combined reviewer reports as JSON:\n\n${JSON.stringify(arrayJSONPack, null, 2)}` },
              ];
              

              // FINAL OUTPUT FROM JUDGE (LEAD DEVELOPER)
              if (inputPackJudge) {

                const judgeCompletion = await callLLM(inputPackJudge);
                const judgeVerdict = judgeCompletion.choices[0]?.message.content;

                console.log(`\n\n⚖️ Judge's pronouncement is...\n\n`);
                await new Promise((resolve) => setTimeout(resolve, 5000));
                console.log(judgeVerdict);
                process.exit(0);

              }

            }
            else {
              console.error(`😕 NO VALID RESPONSE FROM THE LLM(s)`)
              process.exit(1);
            }
 
        }

        else if (isGitMode) {

            const output = spawnSync('git', ['diff', '--staged'], { encoding: 'utf-8' });

            if (output.error || output.status != 0) {
              throw 'Error processing git diff';
            }

            if (!output.stdout || output.stdout.trim().length === 0) {
                console.log('No staged changes to review.');
                process.exit(0);
            }

            // Proceed with git mode logic
            console.log('Reviewing staged changes...');

            // Prepare user input (git diff content output)
            inputPackMaintainer.push({ role: 'user', content: output.stdout })
            inputPackOptimizer.push({ role: 'user', content: output.stdout })

            // HANDLE LLM CONVERSATION WITH TOOL CALLS
            await toolCallLoop(inputPackMaintainer, inputPackOptimizer, isVerbose);

            // FINAL LLMs CALL, FUNCTION RETURNS FINAL OUTPUT
            const { maintainerFinalMSG, optimizerFinalMSG } = await finalCallLLM(inputPackMaintainer, inputPackOptimizer);

            if (maintainerFinalMSG && optimizerFinalMSG) {

              // Collect output, set into arrays of JSON + Raw findings for verbose mode
              const maintainerJSONArray = parseToJSON('🧹MAINTAINER', maintainerFinalMSG, isVerbose);
              const optimizerJSONArray = parseToJSON('⚡OPTIMIZER', optimizerFinalMSG, isVerbose);

              const arrayJSONPack = maintainerJSONArray.concat(optimizerJSONArray);

              const inputPackJudge: any = [  { role: 'system', content: instructionsJudge },  
                                             { role: 'user', content: `Here are the combined reviewer reports as JSON:\n\n${JSON.stringify(arrayJSONPack, null, 2)}` },
              ];


              // FINAL OUTPUT FROM JUDGE (LEAD DEVELOPER)
              if (inputPackJudge) {

                const judgeCompletion = await callLLM(inputPackJudge);
                const judgeVerdict = judgeCompletion.choices[0]?.message.content;

                console.log(`\n\n⚖️ Judge's pronouncement is...\n\n`);
                await new Promise((resolve) => setTimeout(resolve, 5000));
                console.log(judgeVerdict);
                process.exit(0);

              }

            }
            else {
              console.error(`😕 NO VALID RESPONSE FROM THE LLM(s)`)
              process.exit(1);
            }
        }
        // No flag was entered in CLI
        else {
            console.log('⚠️  MAIN(): Please specify either --file <filename> or --gitmode.');
            process.exit(0);
        }


    }
    catch (error: any) {

        console.error(`⚠️  AN ERROR OCCURRED: ${error}`);
        process.exit(1);
    }
}

main();