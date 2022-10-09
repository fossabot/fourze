import { createLogger } from "../logger"
import { FourzeRouter } from "../router"
import { createRequestContext, FourzeRequest, FourzeResponse, FourzeRoute } from "../shared"
import { HTTP_STATUS_CODES } from "./code"

type XHR_RESPONSE_PROPERTY = "readyState" | "responseURL" | "status" | "statusText" | "responseType" | "response" | "responseText" | "responseXML"
type XHR_REQUEST_PROPERTY = "timeout" | "withCredentitals"

const XHR_EVENTS = "readystatechange loadstart progress abort error load timeout loadend".split(" ")
const XHR_REQUEST_PROPERTIES: XHR_REQUEST_PROPERTY[] = ["timeout", "withCredentitals"]
const XHR_RESPONSE_PROPERTIES: XHR_RESPONSE_PROPERTY[] = ["readyState", "response", "responseText", "responseType", "responseURL", "responseXML", "status", "statusText"]

const READY_STATES = {
    UNSENT: 0,
    OPENED: 1,
    HEADERS_RECEIVED: 2,
    LOADING: 3,
    DONE: 4
}

export function setProxyXHR(router: FourzeRouter) {
    const OriginalXmlHttpRequest = globalThis.XMLHttpRequest
    if (!OriginalXmlHttpRequest) {
        return
    }
    const logger = createLogger("@fourze/mock")

    class MockXMLHttpRequest {
        $base: XMLHttpRequest | null = null
        $route: FourzeRoute | undefined

        readonly DONE: number = 4
        readonly HEADERS_RECEIVED: number = 2
        readonly LOADING: number = 3
        readonly OPENED: number = 1
        readonly UNSENT: number = 0

        get $routes() {
            return router.routes
        }

        $request!: FourzeRequest
        $response!: FourzeResponse

        constructor() {
            this.requestHeaders = {}
            this.responseHeaders = {}
            this.response = null
            this.responseText = ""
            this.responseXML = null
            this.responseType = "json"
            this.responseURL = ""
            this.headers = {}

            this.upload = null

            this.readyState = READY_STATES.UNSENT

            this.async = true

            this.status = 0
            this.statusText = ""

            this.timeout = 0

            this.withCredentials = false

            this.events = {}

            this.$base = null
        }

        onreadystatechange: ((ev: Event) => any) | null = null

        onabort: ((ev: ProgressEvent) => any) | null = null
        onerror: ((ev: ProgressEvent) => any) | null = null
        onload: ((ev: ProgressEvent) => any) | null = null
        onloadend: ((ev: ProgressEvent) => any) | null = null
        onloadstart: ((ev: ProgressEvent) => any) | null = null
        onprogress: ((ev: ProgressEvent) => any) | null = null
        ontimeout: ((ev: ProgressEvent) => any) | null = null

        upload: XMLHttpRequestUpload | null

        readyState: number
        status: number
        statusText: string
        response: any
        headers: Record<string, string>
        body: any
        async: boolean
        requestHeaders: Record<string, string>
        responseHeaders: Record<string, string>
        events: Record<string, EventListener[]>
        responseText: string
        responseType: XMLHttpRequestResponseType
        responseURL: string
        responseXML: Document | null
        timeout: number
        withCredentials: boolean

        getAllResponseHeaders() {
            if (!!this.$base) {
                return this.$base.getAllResponseHeaders()
            }
            // 拦截 XHR
            return Object.entries(this.responseHeaders)
                .map(([key, value]) => `${key}: ${value}`)
                .join("\r\n")
        }

        setRequestHeader(name: string, value: string) {
            if (!!this.$base) {
                this.$base.setRequestHeader(name, value)
                return
            }

            let existValue = this.requestHeaders[name]
            if (existValue) {
                value = existValue.concat(",").concat(value)
            }
            this.requestHeaders[name] = value
        }

        overrideMimeType(mime: string) {
            this.$base?.overrideMimeType(mime)
        }

        removeEventListener(type: string, listener: EventListener) {
            const handles = this.events[type]
            if (handles) {
                const index = handles.indexOf(listener)
                if (index > -1) {
                    handles.splice(index, 1)
                }
            }
        }

        open(method: string, url: URL | string, async: boolean = true, username?: string, password?: string) {
            const handle = (event: Event) => {
                if (this.$base) {
                    this.onload = this.$base.onload
                    this.onerror = this.$base.onerror
                    this.onabort = this.$base.onabort
                    this.ontimeout = this.$base.ontimeout
                    this.onprogress = this.$base.onprogress
                    this.onloadstart = this.$base.onloadstart
                    this.onloadend = this.$base.onloadend
                    this.onreadystatechange = this.$base.onreadystatechange
                    this.withCredentials = this.$base.withCredentials
                    this.timeout = this.$base.timeout
                    this.responseType = this.$base.responseType
                    this.upload = this.$base.upload
                }

                this.dispatchEvent(new Event(event.type))
            }

            this.$base = new OriginalXmlHttpRequest()
            for (let event of XHR_EVENTS) {
                this.$base.addEventListener(event, handle)
            }
            this.$base.open(method, url, async, username, password)

            logger.info("mock url ->", url)

            const { request, response } = createRequestContext({
                url: url.toString(),
                method: method,
                headers: this.requestHeaders
            })

            this.$request = request
            this.$response = response

            this.readyState = READY_STATES.OPENED

            this.dispatchEvent(new Event("readystatechange"))
        }

        async send(data?: Document | XMLHttpRequestBodyInit | null | undefined) {
            this.$request.body = (typeof data === "string" ? JSON.parse(data) : data) ?? this.$request.body ?? {}

            await router.setup()

            const url = this.$request.url
            const method = this.$request.method

            const route = router.match(url, method)

            if (!route || this.requestHeaders["Use-Mock"] === "off") {
                logger.warn(`Not found route, fallback to original -> [${method ?? "GET"}] ${url}`)
                if (!!this.$base) {
                    this.$base.timeout = this.timeout
                    this.$base.responseType = this.responseType
                    this.$base.withCredentials = this.withCredentials
                    this.$base.send(data)
                }
                return
            }

            logger.debug(`Found route by [${method ?? "GET"}] ${url}`)

            this.$base?.abort()

            this.setRequestHeader("X-Requested-With", "Fourze XHR Proxy")
            this.setRequestHeader("Origin", location.origin)
            this.setRequestHeader("Host", location.host)
            this.dispatchEvent(new Event("loadstart"))

            this.readyState = READY_STATES.HEADERS_RECEIVED
            this.dispatchEvent(new Event("readystatechange"))
            this.readyState = READY_STATES.LOADING
            this.dispatchEvent(new ProgressEvent("readystatechange"))
            this.status = 200
            this.statusText = HTTP_STATUS_CODES[200]

            await router(this.$request, this.$response)

            this.response = this.$response.result

            this.responseText = this.$response.result

            this.readyState = READY_STATES.DONE

            this.dispatchEvent(new Event("readystatechange"))

            this.dispatchEvent(new Event("load"))
            this.dispatchEvent(new Event("loadend"))
        }

        abort() {
            if (!!this.$base) {
                this.$base.abort()
                return
            }

            this.readyState = READY_STATES.UNSENT
            this.dispatchEvent(new Event("abort"))
            this.dispatchEvent(new Event("error"))
        }

        getResponseHeader(name: string) {
            if (!!this.$base) {
                return this.$base.getResponseHeader(name)
            }
            return this.responseHeaders[name]
        }

        addEventListener(type: string, listener: EventListener) {
            if (!this.events[type]) {
                this.events[type] = []
            }
            this.events[type].push(listener)
        }

        dispatchEvent(event: Event): boolean {
            const handles = this.events[event.type] || []
            for (let i = 0; i < handles.length; i++) {
                handles[i].call(this, event)
            }
            const e = event as ProgressEvent
            switch (event.type) {
                case "load":
                    this.onload?.(e)
                    break
                case "error":
                    this.onerror?.(e)
                    break
                case "abort":
                    this.onabort?.(e)
                    break
                case "timeout":
                    this.ontimeout?.(e)
                    break
                case "progress":
                    this.onprogress?.(e)
                    break
                case "loadstart":
                    this.onloadstart?.(e)
                    break
                case "loadend":
                    this.onloadend?.(e)
                    break
                case "readystatechange":
                    this.onreadystatechange?.(e)
                    break
            }

            return handles.length > 0
        }
    }

    globalThis.XMLHttpRequest = MockXMLHttpRequest as unknown as typeof OriginalXmlHttpRequest
}
