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
    setLevel(level: number): void
    level: number
}

export let logger: Logger = {
    level: LOGGER_LEVELS.ALL,
    setLevel(level: number | string) {
        this.level = typeof level === "string" ? LOGGER_LEVELS[level as keyof typeof LOGGER_LEVELS] ?? 0 : level
    },
    info(...args: any[]) {
        if (this.level <= LOGGER_LEVELS.INFO) {
            console.info(`[INFO ${dayjs().format("YYYY-MM-DD HH:mm:ss")}]`, ...args)
        }
    },
    debug(...args: any[]) {
        if (this.level <= LOGGER_LEVELS.DEBUG) {
            console.debug(`[DEBUG ${dayjs().format("YYYY-MM-DD HH:mm:ss")}]`, ...args)
        }
    },
    warn(...args: any[]) {
        if (this.level <= LOGGER_LEVELS.WARN) {
            console.warn(`[WARNING ${dayjs().format("YYYY-MM-DD HH:mm:ss")}]`, ...args)
        }
    },
    trace(...args: any[]) {
        if (this.level <= LOGGER_LEVELS.TRACE) {
            console.trace(`[TRACE ${dayjs().format("YYYY-MM-DD HH:mm:ss")}]`, ...args)
        }
    },

    error(...args: any[]) {
        if (this.level <= LOGGER_LEVELS.ERROR) {
            console.error(`[ERROR ${dayjs().format("YYYY-MM-DD HH:mm:ss")}]`, ...args)
        }
    },
    fatal(...args: any[]) {
        if (this.level <= LOGGER_LEVELS.FATAL) {
            console.error(`[FATAL ${dayjs().format("YYYY-MM-DD HH:mm:ss")}]`, ...args)
        }
    }
} as FourzeLogger

export function setLogger(_logger: Logger) {
    logger = _logger
}
