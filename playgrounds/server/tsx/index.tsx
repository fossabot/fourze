import { defineFourzeComponent } from "@fourze/core"

export default defineFourzeComponent(() => {
    const list = Array.from({ length: 26 }).map((_, i) => String.fromCharCode(65 + i))
    return () => (
        <>
            <div class={"w-4 ".concat("h-4").concat(" m-4")}>
                <div>{"Hello,World"}</div>
                {list.map(item => (
                    <div>{item}</div>
                ))}
                <button>测试</button>
                <div class={"w-4 ".concat("h-4").concat(" m-4")}>
                    <div>{"Hello,World"}</div>
                    {list.map(item => (
                        <div>{item}</div>
                    ))}
                    <button>测试</button>
                </div>
                <div class={"w-4 ".concat("h-4").concat(" m-4")}>
                    <div>{"Hello,World"}</div>
                    {list.map(item => (
                        <div>{item}</div>
                    ))}
                    <button>测试</button>
                </div>{" "}
                <div class={"w-4 ".concat("h-4").concat(" m-4")}>
                    <div>{"Hello,World"}</div>
                    {list.map(item => (
                        <div>{item}</div>
                    ))}
                    <button>测试</button>
                </div>{" "}
                <div class={"w-4 ".concat("h-4").concat(" m-4")}>
                    <div>{"Hello,World"}</div>
                    {list.map(item => (
                        <div>{item}</div>
                    ))}
                    <button>测试</button>
                </div>{" "}
                <div class={"w-4 ".concat("h-4").concat(" m-4")}>
                    <div>{"Hello,World"}</div>
                    {list.map(item => (
                        <div>{item}</div>
                    ))}{" "}
                    <div class={"w-4 ".concat("h-4").concat(" m-4")}>
                        <div>{"Hello,World"}</div>
                        {list.map(item => (
                            <div>{item}</div>
                        ))}
                        <button>测试</button>
                    </div>{" "}
                    <div class={"w-4 ".concat("h-4").concat(" m-4")}>
                        <div>{"Hello,World"}</div>
                        {list.map(item => (
                            <div>{item}</div>
                        ))}
                        <button>测试</button>
                    </div>{" "}
                    <div class={"w-4 ".concat("h-4").concat(" m-4")}>
                        <div>{"Hello,World"}</div>
                        {list.map(item => (
                            <div>{item}</div>
                        ))}
                        <button>测试</button>
                    </div>{" "}
                    <div class={"w-4 ".concat("h-4").concat(" m-4")}>
                        <div>{"Hello,World"}</div>
                        {list.map(item => (
                            <div>{item}</div>
                        ))}
                        <button>测试</button>
                    </div>{" "}
                    <div class={"w-4 ".concat("h-4").concat(" m-4")}>
                        <div>{"Hello,World"}</div>
                        {list.map(item => (
                            <div>{item}</div>
                        ))}
                        <button>测试</button>
                    </div>{" "}
                    <div class={"w-4 ".concat("h-4").concat(" m-4")}>
                        <div>{"Hello,World"}</div>
                        {list.map(item => (
                            <div>{item}</div>
                        ))}{" "}
                        <div class={"w-4 ".concat("h-4").concat(" m-4")}>
                            <div>{"Hello,World"}</div>
                        </div>{" "}
                        <div class={"w-4 ".concat("h-4").concat(" m-4")}>
                            <div>{"Hello,World"}</div>
                            {list.map(item => (
                                <div>{item}</div>
                            ))}
                            <button>测试</button>
                        </div>
                        <button>测试</button>
                    </div>
                    <button>测试</button>
                </div>
            </div>
        </>
    )
})
