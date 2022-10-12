import { createApp } from "vue"
import { createRouter, createWebHistory, RouterView } from "vue-router"
import "windi.css"

createApp(RouterView)
    .use(
        createRouter({
            history: createWebHistory("/"),
            routes: [
                {
                    path: "/",
                    redirect: "/home"
                },
                {
                    path: "/home",
                    component: () => import("./app.vue")
                },
                {
                    path: "/fallback",
                    component: () => import("./app.vue")
                }
            ]
        })
    )
    .mount("#app")
