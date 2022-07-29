import "@fourze/client"
import { createApp } from "vue"
import { createRouter, createWebHistory, RouterView } from "vue-router"

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
                    component: () => import("./home.vue")
                },
                {
                    path: "/fallback",
                    component: () => import("./home.vue")
                }
            ]
        })
    )
    .mount("#app")
