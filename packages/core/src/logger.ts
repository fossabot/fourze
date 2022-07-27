import dayjs from "dayjs"

export const LOGGER_LEVELS = {
    TRACE: 0,
    DEBUG: 1,
    INFO: 2,
    WARN: 3,
    ERROR: 4,
    FATAL: 5,
    ALL: Number.MIN_VALUE,
    OFF: Number.MAX_VALUE
}

export interface Logger {
    setLevel(level: number | string): void
    // info
    info(...args: any[]): void
    // debug
    debug(...args: any[]): void
    // warn
    warn(...args: any[]): void
    // error
    error(...args: any[]): void
    // fatal
    fatal(...args: any[]): void
    // trace
    trace(...args: any[]): void
}

export interface FourzeLogger extends Logger {
    level: number
}

function now() {
    return dayjs().format("YYYY-MM-DD HH:mm:ss")
}

export class Logger {
    level: number = LOGGER_LEVELS.INFO

    readonly scope: string

    constructor(scope: string) {
        this.scope = scope
    }
    setLevel(level: number | string) {
        this.level = typeof level === "string" ? LOGGER_LEVELS[level as keyof typeof LOGGER_LEVELS] : level
    }
    info(...args: any[]) {
        this.log(LOGGER_LEVELS.INFO, ...args)
    }
    debug(...args: any[]) {
        this.log(LOGGER_LEVELS.DEBUG, ...args)
    }
    warn(...args: any[]) {
        this.log(LOGGER_LEVELS.WARN, ...args)
    }
    error(...args: any[]) {
        this.log(LOGGER_LEVELS.ERROR, ...args)
    }
    fatal(...args: any[]) {
        this.log(LOGGER_LEVELS.FATAL, ...args)
    }
    trace(...args: any[]) {
        this.log(LOGGER_LEVELS.TRACE, ...args)
    }
    log(level: number, ...args: any[]) {
        if (level >= this.level) {
            console.log(`[${now()}] [${this.scope}]`, ...args)
        }
    }
}
