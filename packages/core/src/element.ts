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
