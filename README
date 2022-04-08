# Install

`npm install @fourze/core`

## vite

`npm install @fourze/vite`

vite.config.ts

```
import fourze from "@fourze/vite"

export default defineConfig({
    plugins: [fourze()],
})
```

# Example

## Route

src/mock/example.ts

```
    import {defineRoute} from "@fourze/core"
    export default defineRoute(mock=>{
        mock("/api/user/:id",(req,res)=>{
            return {
                id:req.params.id
                name:"test"
            }
        })
    })

```

# Build

## inject mock

```
    vite build --mode mock
```
