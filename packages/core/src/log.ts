import dayjs from "dayjs"

export const logger = {
    level: "info",
    info(...args: any[]) {
        if (this.level === "info") {
            console.info(`[Fourze ${dayjs().format("YYYY-MM-DD HH:mm:ss")}]`, ...args)
        }
    },
    error(...args: any[]) {
        if (this.level === "error") {
            console.error(`[Fourze ${dayjs().format("YYYY-MM-DD HH:mm:ss")}]`, ...args)
        }
    }
}

export default logger
