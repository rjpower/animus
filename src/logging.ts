import chalk from 'chalk';

export enum LogLevels {
  debug = 1,
  info = 2,
  warn = 3,
  error = 4,
  trace = 5,
}

let logLevel = LogLevels.info;

export class Logger {
  private name: string;

  constructor(name: string) {
    this.name = name;
  }

  private shouldLog(level: LogLevels): boolean {
    return logLevel <= level;
  }

  debug(...messages: any[]): void {
    if (this.shouldLog(LogLevels.debug)) {
      console.debug(chalk.blue(`[${this.name}] DEBUG:`, ...messages));
    }
  }

  info(...messages: any[]): void {
    if (this.shouldLog(LogLevels.info)) {
      console.info(chalk.green(`[${this.name}] INFO:`, ...messages));
    }
  }

  warn(...messages: any[]): void {
    if (this.shouldLog(LogLevels.warn)) {
      console.warn(chalk.yellow(`[${this.name}] WARN:`, ...messages));
    }
  }

  error(...messages: any[]): void {
    if (this.shouldLog(LogLevels.error)) {
      console.error(chalk.red(`[${this.name}] ERROR:`, ...messages));
    }
  }

  trace(...messages: any[]): void {
    console.trace(chalk.magenta(`[${this.name}] TRACE:`, ...messages));
  }
}

export function createLogger(name: string): Logger {
  return new Logger(name);
}
