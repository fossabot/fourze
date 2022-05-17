import React, { useState } from "react"
import { createRoot } from "react-dom/client"
import axios from "axios"

const App = () => {
    const [list, setList] = useState([])

    function search() {
        axios(`/api/search/${Math.floor(Math.random() * 9)}`)
            .then(r => r.data)
            .then(r => setList(r))
    }

    return (
        <div>
            <img style={{ width: "120px", height: "120px" }} src="/api/img/a.jpg" />
            <button onClick={search}>Click Me!</button>
            {list.map(item => (
                <div key={item}>{item}</div>
            ))}
        </div>
    )
}

const container = document.getElementById("app")
const root = createRoot(container!)
root.render(<App />)
