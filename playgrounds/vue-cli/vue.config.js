const fourze = require("@fourze/webpack")
const { defineConfig } = require("@vue/cli-service")
const path = require("path")

module.exports = defineConfig({
    transpileDependencies: true,

    configureWebpack: {
        devServer: {
            proxy: {
                "/api": {
                    target: "http://localhost:8001",
                    pathRewrite: {
                        "^/api": "/api"
                    }
                }
            }
        },
        plugins: [
            fourze({
                server: {
                    port: 8001
                },
                dir: path.resolve(__dirname, "mock"),
                mock: false
            })
        ]
    }
})
