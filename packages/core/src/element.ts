import { MaybePromise } from "./types"

export function createElement(tag: string, props: any = {}, ...children: string[]) {
    if (!props || typeof props != "object" || Array.isArray(props)) {
        props = {}
    }

    if (props.class && Array.isArray(props.class)) {
        props.class = props.class.join(" ")
    }

    function renderChildren(children: string[]): string {
        if (Array.isArray(children)) {
            return children.map(c => (Array.isArray(c) ? renderChildren(c) : c)).join("")
        }
        return children
    }

    return (
        "<" +
        tag +
        " " +
        Object.entries(props)
            .map(([k, v]) => `${k}="${v}"`)
            .join(" ") +
        ">" +
        renderChildren(children) +
        "</" +
        tag +
        ">"
    )
}

export const FourzeComponentSymbol = Symbol("FourzeComponent")

export interface FourzeComponentOption {
    name?: string
    setup?: () => MaybePromise<this["render"] | Record<string, any>>
    render?: () => MaybePromise<JSX.Element>
}

export interface FourzeComponent extends FourzeComponentOption {
    [FourzeComponentSymbol]: true
}

export function defineFourzeComponent(component: FourzeComponentOption | FourzeComponentOption["setup"]): FourzeComponent {
    if (typeof component === "function") {
        component = { setup: component }
    }
    return {
        ...component,
        [FourzeComponentSymbol]: true
    }
}

export function isFourzeComponent(component: any): component is FourzeComponent {
    return component && component[FourzeComponentSymbol]
}
