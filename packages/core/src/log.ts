export const logger = {
    level: "info",
    info(...args: any[]) {
        if (this.level === "info") {
            console.info(`[fourze][${new Date().toDateString()}]`, ...args)
        }
    },
    error(...args: any[]) {
        if (this.level === "error") {
            console.error("[fourze]", `[${new Date().toDateString()}]`, ...args)
        }
    }
}

export default logger
