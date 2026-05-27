// npm install zod
import * as z from 'zod';


// LLM output schema
export const findingSchema = z.object({

    file: z.string().default('-').describe('File path of the file you are analyzing'),
    line_number: z.number().default(0).describe('Line number of the behaviour you want to feedback'),
    severity: z
      .enum(['INFO', 'WARN', 'CRITICAL'])
      .describe('Type of feedback: one of [INFO, WARN, CRITICAL]'),
    category: z
      .enum(['UI', 'SECURITY', 'PERFORMANCE'])
      .describe('IT category of the feedback: one of [UI, SECURITY, PERFORMANCE]'),
    description: z.string().default('-').describe('Description of what is happening in this snippet you are analyzing'),

}).describe('LLM output format to follow, attributes are: file, line_number, severity, category, description');


// This schema will be the used one by the LLM's, as they produce an ARRAY of reports (above schema)
export const schemaLLM = z.object({
  findings: z.array(findingSchema).min(1),

  
});


// TOOLS SCHEMAS
export const read_file_tool = 
  {
    type: 'function' as const,
    function: {
      name: 'read_file',
      description: 'Reads a file content located by the path (first parameter), boundary parameters start_line and end_line are optional, if entered, function returns content within these boundaries (inclusive). If no boundary parameters are specified, returns content found up to 10000 characters (truncated if exceeds this number), else returns up to 150 lines of content. If not found returns validation message', 

      parameters: {
        type: 'object',
        properties: {
          file_path: {
            type: 'string',
            description: 'The path where the file is located',
          },
          start_line: {
            type: 'number',
            description: 'The line number where to start reading content (optional)',
            default: 0,
          },
          end_line: {
            type: 'number',
            description: 'The line number where to end reading content (optional)',
            default: 0,
          },
        },
        required: ['file_path'],
        additionalProperties: false,
      },
      strict: true,
    },
};


export const grep_codebase_tool = 
  {
    type: 'function' as const,
    function: {
      name: 'grep_codebase',
      description: 'Runs the ripgrep command and searches within the entire codebase (starting from the root directory of the appplication) for the pattern parameter provided, it can be used to investigate function definitions, seek caller\'s details, find test code, or any other research required. Returns content found up to 10000 characters (truncated if exceeds this number), if content not found returns validation message', 

      parameters: {
        type: 'object',
        properties: {
          search_pattern: {
            type: 'string',
            description: 'The pattern to lookup in the codebase',
          },
        },
        required: ['search_pattern'],
        additionalProperties: false,
      },
      strict: true,
    },
};


export const file_history_tool = 
  {
    type: 'function' as const,
    function: {
      name: 'get_file_history',
      description: 'Runs the "git log -p -n 3 <file_path>" command and seeks for the last 3 commits of the file (located by the argument path provided) to analyze changes in each one of them. Returns content found up to 10000 characters (truncated if exceeds this number). If the provided file does not show history or is not found at all, it returns a proper message', 

      parameters: {
        type: 'object',
        properties: {
          file_path: {
            type: 'string',
            description: 'The file path to look for its commits messages and changes',
          },
        },
        required: ['file_path'],
        additionalProperties: false,
      },
      strict: true,
    },
};