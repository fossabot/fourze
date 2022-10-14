import { createLogger, createRouter, isNode } from "@fourze/core"
import { createProxyFetch } from "./fetch"
import { createProxyRequest } from "./request"
import { FourzeMockRequestMode, FourzeMockRouter, FourzeMockRouterOptions } from "./types"
import { createProxyXMLHttpRequest } from "./xhr"

export function createMockRouter(options: FourzeMockRouterOptions = {}): FourzeMockRouter {
    const logger = createLogger("@fourze/mock")

    const instance = createRouter(options) as FourzeMockRouter

    logger.info("Fourze Mock is starting...")

    const mode = options.mode ?? (isNode() ? ["request"] : ["xhr", "fetch"])

    if (mode.includes("request") && isNode()) {
        const http = require("http")
        const https = require("https")

        instance.originalHttpRequest = http.request
        instance.originalHttpsRequest = https.request

        instance.request = createProxyRequest(instance) as typeof http.request
    }

    if (mode.includes("xhr")) {
        const XMLHttpRequest = globalThis.XMLHttpRequest
        instance.originalXMLHttpRequest = XMLHttpRequest
        instance.XmlHttpRequest = createProxyXMLHttpRequest(instance) as unknown as typeof XMLHttpRequest
    }

    if (mode.includes("fetch")) {
        instance.originalFetch = globalThis.fetch
        instance.fetch = createProxyFetch(instance) as typeof fetch
    }

    instance.enable = function (_mode: FourzeMockRequestMode[] = mode) {
        if (_mode.includes("fetch")) {
            globalThis.fetch = this.fetch
            logger.info("Fourze Mock is enabled for fetch")
        }
        if (_mode.includes("xhr")) {
            globalThis.XMLHttpRequest = this.XmlHttpRequest
            logger.info("Fourze Mock is enabled for xhr")
        }
        if (_mode.includes("request")) {
            const http = require("http") as typeof import("http")
            const https = require("https") as typeof import("https")
            http.request = this.request
            https.request = this.request
            logger.info("Fourze Mock is enabled for request")
        }
    }

    instance.disable = function (_mode: FourzeMockRequestMode[] = mode) {
        if (_mode.includes("fetch")) {
            globalThis.fetch = this.originalFetch
            logger.success("Fourze Mock is disabled for fetch")
        }
        if (_mode.includes("xhr")) {
            globalThis.XMLHttpRequest = this.originalXMLHttpRequest
            logger.success("Fourze Mock is disabled for xhr")
        }
        if (_mode.includes("request") && isNode()) {
            const http = require("http") as typeof import("http")
            const https = require("https") as typeof import("https")
            http.request = this.originalHttpRequest
            https.request = this.originalHttpsRequest
            logger.success("Fourze Mock is disabled for request")
        }
    }

    instance.enable()

    return instance
}

export * from "./types"
