export let LOG_LEVEL = "info";

export default {
  level: "info",
  info(...args: any[]) {
    if (this.level === "info") {
      console.info("[fourze]", ...args);
    }
  },
  error(...args: any[]) {
    if (this.level === "error") {
      console.error("[fourze]", ...args);
    }
  },
};
