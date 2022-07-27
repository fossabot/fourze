import { defineFourzeComponent } from "@fourze/core"

export default defineFourzeComponent(() => {
    const list = ["a", "b", "c"]

    return () => (
        <div class={"w-4 ".concat("h-4").concat(" m-4")}>
            <div>{"Hello,World"}</div>
            {list.map(item => (
                <div>{item}</div>
            ))}
        </div>
    )
})
