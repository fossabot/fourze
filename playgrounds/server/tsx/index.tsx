export default {
    async render(context: any) {
        const list = ["a", "b", "c"]

        return async () => {
            return (
                <div class={"w-4 ".concat("h-4").concat(" m-4")}>
                    <div>{"Hello,World"}</div>
                    {list.map(item => (
                        <div>{item}</div>
                    ))}
                </div>
            )
        }
    }
}
