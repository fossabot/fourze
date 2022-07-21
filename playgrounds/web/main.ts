import { createApp } from "vue"
import { RouterView, createRouter, createWebHistory } from "vue-router"

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
