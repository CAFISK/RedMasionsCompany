import type {
  Command,
  DialogueCommand,
  NarratorCommand,
  MonologueCommand,
  ShowCommand,
  HideCommand,
  BgCommand,
  BgmCommand,
  BgsCommand,
  SfxCommand,
  ChoiceCommand,
  ChoiceOption,
  JumpCommand,
  LabelCommand,
  SetCommand,
  IfCommand,
  ElifCommand,
  ExpressionCommand,
  MoveCommand,
  ShakeCommand,
  FlashCommand,
  WeatherCommand,
  CameraCommand,
  CinematicCommand,
  ChapterCommand,
  VideoCommand,
  InputCommand,
  AchievementCommand,
  WaitCommand,
  StopCommand,
  FadeCommand,
  EndCommand,
  CharacterPosition,
  TransitionConfig,
  TransitionType,
} from './types';

/**
 * ScriptParser - Parses .vns script files into an array of Command objects.
 *
 * Supported syntax:
 *   # comment
 *   [scene name]
 *   [bg image with transition duration=N]
 *   [bgm track]
 *   [show character at position with transition]
 *   [hide character]
 *   [expression character expr]
 *   [move character to position duration=N]
 *   [sfx sound]
 *   [shake target intensity=N duration=N]
 *   [flash color=#fff duration=N]
 *   [weather effect intensity=N]
 *   [camera action ...]
 *   [cinematic on|off]
 *   [chapter "title" subtitle="sub" duration=N]
 *   [video src skippable=true]
 *   [input variable prompt="..." max=N]
 *   [achievement unlock "id" title="..." desc="..."]
 *   [wait N]
 *   [set variable op value]
 *   [if condition] ... [elif condition] ... [else] ... [/if]
 *   [jump target with transition]
 *   [label name]
 *   [stop channel fadeOut=N]
 *   [fade in|out color=#000 duration=N]
 *   [choice] ... [/choice]
 *   character(expression): "dialogue text"
 *   : "narrator text"
 *   character(thinking): (monologue text)
 */
export class ScriptParser {
  /**
   * Parse a VNS script string into an array of commands
   */
  parse(script: string): Command[] {
    const lines = script.split('\n').map((l) => l.replace(/\r$/, ''));
    const commands: Command[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i].trim();
      i++;

      // Skip empty lines and comments
      if (!line || line.startsWith('#')) continue;

      // Choice block
      if (line === '[choice]') {
        const options: ChoiceOption[] = [];
        let timeout: number | undefined;
        let defaultOption: number | undefined;

        while (i < lines.length) {
          const choiceLine = lines[i].trim();
          i++;
          if (choiceLine === '[/choice]') break;
          if (!choiceLine) continue;

          // Parse: "text" [if condition] -> target
          const choiceMatch = choiceLine.match(
            /^"([^"]+)"\s*(?:\[if\s+(.+?)\]\s*)?->\s*(\S+)$/
          );
          if (choiceMatch) {
            options.push({
              text: choiceMatch[1],
              target: choiceMatch[3],
              condition: choiceMatch[2] || undefined,
            });
          }

          // Parse timeout
          const timeoutMatch = choiceLine.match(/^timeout=(\d+)\s+default=(\d+)$/);
          if (timeoutMatch) {
            timeout = parseInt(timeoutMatch[1]);
            defaultOption = parseInt(timeoutMatch[2]);
          }
        }

        const cmd: ChoiceCommand = { type: 'choice', options, lineNumber: i };
        if (timeout !== undefined) cmd.timeout = timeout;
        if (defaultOption !== undefined) cmd.defaultOption = defaultOption;
        commands.push(cmd);
        continue;
      }

      // Bracket commands [...]
      if (line.startsWith('[') && !line.startsWith('[/')) {
        const cmd = this.parseBracketCommand(line, i);
        if (cmd) commands.push(cmd);
        continue;
      }

      // Dialogue: character(expression): "text"
      const dialogueMatch = line.match(
        /^(\w+)(?:\((\w+)\))?\s*:\s*"(.+)"$/
      );
      if (dialogueMatch) {
        const [, character, expression, text] = dialogueMatch;
        commands.push({
          type: 'dialogue',
          character,
          expression: expression || undefined,
          text,
          lineNumber: i,
        } as DialogueCommand);
        continue;
      }

      // Monologue: character(thinking): (text)
      const monoMatch = line.match(
        /^(\w+)\(thinking\)\s*:\s*\((.+)\)$/
      );
      if (monoMatch) {
        commands.push({
          type: 'monologue',
          character: monoMatch[1],
          text: monoMatch[2],
          lineNumber: i,
        } as MonologueCommand);
        continue;
      }

      // Narrator: : text  or  : "text"
      const narratorMatch = line.match(/^:\s*"?(.+?)"?$/);
      if (narratorMatch) {
        commands.push({
          type: 'narrator',
          text: narratorMatch[1],
          lineNumber: i,
        } as NarratorCommand);
        continue;
      }
    }

    return commands;
  }

  /**
   * Parse a single bracket command line
   */
  private parseBracketCommand(line: string, lineNumber: number): Command | null {
    // Remove outer brackets
    const inner = line.slice(1, -1).trim();
    const parts = this.tokenize(inner);
    if (parts.length === 0) return null;

    const keyword = parts[0].toLowerCase();

    switch (keyword) {
      case 'scene':
        return { type: 'scene', name: parts[1] || '', lineNumber } as Command;

      case 'bg':
        return this.parseBgCommand(parts, lineNumber);

      case 'bgm':
        return this.parseBgmCommand(parts, lineNumber);

      case 'bgs':
        return this.parseBgsCommand(parts, lineNumber);

      case 'sfx':
        return {
          type: 'sfx',
          sound: parts[1] || '',
          volume: this.extractNumber(parts, 'volume'),
          lineNumber,
        } as SfxCommand;

      case 'show':
        return this.parseShowCommand(parts, lineNumber);

      case 'hide':
        return {
          type: 'hide',
          character: parts[1] || '',
          transition: this.extractTransition(parts),
          lineNumber,
        } as HideCommand;

      case 'expression':
        return {
          type: 'expression',
          character: parts[1] || '',
          expression: parts[2] || '',
          lineNumber,
        } as ExpressionCommand;

      case 'move':
        return this.parseMoveCommand(parts, lineNumber);

      case 'shake':
        return {
          type: 'shake',
          target: parts[1] || 'screen',
          intensity: this.extractNumber(parts, 'intensity') ?? 5,
          duration: this.extractNumber(parts, 'duration') ?? 500,
          lineNumber,
        } as ShakeCommand;

      case 'flash':
        return {
          type: 'flash',
          color: this.extractString(parts, 'color') ?? '#ffffff',
          duration: this.extractNumber(parts, 'duration') ?? 300,
          lineNumber,
        } as FlashCommand;

      case 'weather':
        return {
          type: 'weather',
          effect: (parts[1] || 'clear') as WeatherCommand['effect'],
          intensity: this.extractNumber(parts, 'intensity') ?? 0.5,
          transition: this.extractTransition(parts),
          lineNumber,
        } as WeatherCommand;

      case 'camera':
        return this.parseCameraCommand(parts, lineNumber);

      case 'cinematic':
        return {
          type: 'cinematic',
          enabled: parts[1] === 'on',
          lineNumber,
        } as CinematicCommand;

      case 'chapter':
        return {
          type: 'chapter',
          title: this.extractQuoted(parts, 1) || parts[1] || '',
          subtitle: this.extractString(parts, 'subtitle'),
          duration: this.extractNumber(parts, 'duration') ?? 3000,
          lineNumber,
        } as ChapterCommand;

      case 'video':
        return {
          type: 'video',
          src: parts[1] || '',
          skippable: this.extractBool(parts, 'skippable') ?? true,
          lineNumber,
        } as VideoCommand;

      case 'input':
        return {
          type: 'input',
          variable: parts[1] || '',
          prompt: this.extractString(parts, 'prompt') ?? '',
          maxLength: this.extractNumber(parts, 'max'),
          lineNumber,
        } as InputCommand;

      case 'achievement':
        if (parts[1] === 'unlock') {
          return {
            type: 'achievement',
            id: this.extractQuoted(parts, 2) || parts[2] || '',
            title: this.extractString(parts, 'title') ?? '',
            description: this.extractString(parts, 'desc') ?? '',
            lineNumber,
          } as AchievementCommand;
        }
        return null;

      case 'wait':
        return {
          type: 'wait',
          duration: parseInt(parts[1]) || 1000,
          lineNumber,
        } as WaitCommand;

      case 'set':
        return this.parseSetCommand(parts, lineNumber);

      case 'if':
        return {
          type: 'if',
          condition: parts.slice(1).join(' '),
          lineNumber,
        } as IfCommand;

      case 'elif':
        return {
          type: 'elif',
          condition: parts.slice(1).join(' '),
          lineNumber,
        } as ElifCommand;

      case 'else':
        return { type: 'else', lineNumber } as Command;

      case '/if':
        return { type: 'endif', lineNumber } as Command;

      case 'jump':
        return {
          type: 'jump',
          target: parts[1] || '',
          transition: this.extractTransition(parts),
          lineNumber,
        } as JumpCommand;

      case 'label':
        return {
          type: 'label',
          name: parts[1] || '',
          lineNumber,
        } as LabelCommand;

      case 'stop':
        return {
          type: 'stop',
          channel: (parts[1] || 'all') as StopCommand['channel'],
          fadeOut: this.extractNumber(parts, 'fadeOut'),
          lineNumber,
        } as StopCommand;

      case 'fade':
        return {
          type: 'fade',
          direction: (parts[1] || 'out') as FadeCommand['direction'],
          color: this.extractString(parts, 'color') ?? '#000000',
          duration: this.extractNumber(parts, 'duration') ?? 1000,
          lineNumber,
        } as FadeCommand;

      case 'end':
        return { type: 'end', lineNumber } as EndCommand;

      default:
        console.warn(`[ScriptParser] Unknown command: ${keyword}`);
        return null;
    }
  }

  private parseBgCommand(parts: string[], lineNumber: number): BgCommand {
    return {
      type: 'bg',
      image: parts[1] || '',
      transition: this.extractTransition(parts),
      lineNumber,
    };
  }

  private parseBgmCommand(parts: string[], lineNumber: number): BgmCommand {
    return {
      type: 'bgm',
      track: parts[1] || '',
      volume: this.extractNumber(parts, 'volume'),
      fadeIn: this.extractNumber(parts, 'fadeIn'),
      loop: this.extractBool(parts, 'loop') ?? true,
      lineNumber,
    };
  }

  private parseBgsCommand(parts: string[], lineNumber: number): BgsCommand {
    return {
      type: 'bgs',
      track: parts[1] || '',
      volume: this.extractNumber(parts, 'volume'),
      fadeIn: this.extractNumber(parts, 'fadeIn'),
      loop: this.extractBool(parts, 'loop') ?? true,
      lineNumber,
    };
  }

  private parseShowCommand(parts: string[], lineNumber: number): ShowCommand {
    const character = parts[1] || '';
    let position: CharacterPosition = 'center';

    const atIdx = parts.indexOf('at');
    if (atIdx !== -1 && parts[atIdx + 1]) {
      const posStr = parts[atIdx + 1];
      if (['far_left', 'left', 'center', 'right', 'far_right'].includes(posStr)) {
        position = posStr as CharacterPosition;
      }
    }

    return {
      type: 'show',
      character,
      expression: this.extractExpression(parts),
      position,
      transition: this.extractTransition(parts),
      lineNumber,
    };
  }

  private parseMoveCommand(parts: string[], lineNumber: number): MoveCommand {
    const character = parts[1] || '';
    let position: CharacterPosition = 'center';

    const toIdx = parts.indexOf('to');
    if (toIdx !== -1 && parts[toIdx + 1]) {
      const posStr = parts[toIdx + 1];
      if (['far_left', 'left', 'center', 'right', 'far_right'].includes(posStr)) {
        position = posStr as CharacterPosition;
      }
    }

    return {
      type: 'move',
      character,
      position,
      duration: this.extractNumber(parts, 'duration') ?? 500,
      lineNumber,
    };
  }

  private parseCameraCommand(parts: string[], lineNumber: number): CameraCommand {
    const action = (parts[1] || 'reset') as CameraCommand['action'];
    return {
      type: 'camera',
      action,
      zoom: this.extractNumber(parts, 'zoom'),
      target: this.extractString(parts, 'target'),
      x: this.extractNumber(parts, 'x'),
      y: this.extractNumber(parts, 'y'),
      duration: this.extractNumber(parts, 'duration') ?? 1000,
      ease: this.extractString(parts, 'ease') ?? 'easeInOut',
      lineNumber,
    };
  }

  private parseSetCommand(parts: string[], lineNumber: number): SetCommand {
    // [set variable op value]
    const variable = parts[1] || '';
    const operator = (parts[2] || '=') as SetCommand['operator'];
    const rawValue = parts.slice(3).join(' ');

    let value: string | number | boolean;
    if (rawValue === 'true') value = true;
    else if (rawValue === 'false') value = false;
    else if (!isNaN(Number(rawValue))) value = Number(rawValue);
    else value = rawValue.replace(/^"(.*)"$/, '$1');

    return { type: 'set', variable, operator, value, lineNumber };
  }

  // --- Utility methods ---

  /**
   * Tokenize a string, respecting quoted strings
   */
  private tokenize(input: string): string[] {
    const tokens: string[] = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';

    for (let i = 0; i < input.length; i++) {
      const ch = input[i];
      if (inQuotes) {
        if (ch === quoteChar) {
          inQuotes = false;
          tokens.push(current);
          current = '';
        } else {
          current += ch;
        }
      } else if (ch === '"' || ch === "'") {
        if (current) {
          tokens.push(current);
          current = '';
        }
        inQuotes = true;
        quoteChar = ch;
      } else if (ch === ' ' || ch === '\t') {
        if (current) {
          tokens.push(current);
          current = '';
        }
      } else {
        current += ch;
      }
    }
    if (current) tokens.push(current);
    return tokens;
  }

  private extractTransition(parts: string[]): TransitionConfig | undefined {
    const withIdx = parts.indexOf('with');
    if (withIdx === -1) return undefined;
    const type = (parts[withIdx + 1] || 'fade') as TransitionType;
    const duration = this.extractNumber(parts, 'duration') ?? 500;
    return { type, duration };
  }

  private extractNumber(parts: string[], key: string): number | undefined {
    for (const p of parts) {
      if (p.startsWith(`${key}=`)) {
        const val = parseFloat(p.split('=')[1]);
        if (!isNaN(val)) return val;
      }
    }
    return undefined;
  }

  private extractString(parts: string[], key: string): string | undefined {
    for (const p of parts) {
      if (p.startsWith(`${key}=`)) {
        return p.split('=').slice(1).join('=').replace(/^"(.*)"$/, '$1');
      }
    }
    return undefined;
  }

  private extractBool(parts: string[], key: string): boolean | undefined {
    const val = this.extractString(parts, key);
    if (val === 'true') return true;
    if (val === 'false') return false;
    return undefined;
  }

  private extractQuoted(parts: string[], index: number): string | undefined {
    // Already unquoted by tokenizer
    return parts[index];
  }

  private extractExpression(parts: string[]): string | undefined {
    // Look for expression=xxx or a standalone expression keyword
    return this.extractString(parts, 'expression');
  }
}
