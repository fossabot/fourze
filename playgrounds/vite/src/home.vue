<script lang="tsx">
import { useNow } from "@vueuse/core"
import axios from "axios"
import $ from "jquery"
import { computed, defineComponent, ref } from "vue"
import { ResponseData } from "./utils/setup-mock"

export default defineComponent(() => {
    const list = ref<any[]>([])


    const startTime = ref(0)
    const endTime = ref(0)

    const now = useNow()

    const serverDelay = ref(0)

    const time = computed(() => {
        if (endTime.value === 0) {
            if (startTime.value == 0) {
                return 0
            }
            return now.value.getTime() - startTime.value
        }
        return endTime.value - startTime.value
    })

    function start() {
        startTime.value = Date.now()
        endTime.value = 0
    }

    function end() {
        endTime.value = Date.now()
    }


    async function fetchClick() {
        start()
        await fetch(`/api/search/${Math.floor(Math.random() * 9)}`, { method: "post", body: JSON.stringify({ phone: 2 }) })
            .then(r => {
                serverDelay.value = Number(r.headers.get("Fourze-Delay"))
                return r.json()
            })
            .then(r => r.data)
            .then(r => {
                list.value = Array.isArray(r) ? r : Object.entries(r)
            })
        end()
    }

    async function axiosClick() {
        start()
        await axios
            .post<ResponseData>(`/api/search/${Math.floor(Math.random() * 9)}`, { phone: 2 })
            .then(r => {
                serverDelay.value = Number(r.headers["fourze-delay"])
                return r.data.data
            })
            .then(r => (list.value = Array.isArray(r) ? r : Object.entries(r)))
        end()
    }

    function jqueryClick() {
        start()
        $.ajax({
            url: `/api/search/${Math.floor(Math.random() * 9)}`,
            method: "POST",
            data: JSON.stringify({ phone: 2 }),
            dataType: "json",
            contentType: "application/json",

            success(r) {
                r = r.data
                list.value = Array.isArray(r) ? r : Object.entries(r)
                end()
            },
            complete(r) {
                serverDelay.value = Number(r.getResponseHeader("Fourze-Delay"))
            },
            error(r) {
                console.error(r)
            }
        })

    }
    return () => (
        <div class="px-4">
            <img style={{ width: "120px", height: "120px" }} src="/stat/test.jpg" />
            <div class="flex space-x-4 py-2 items-center">
                <button class="bg-light-blue-400 text-white py-1 px-2 hover:bg-opacity-60" onClick={fetchClick}>Fetch</button>
                <button class="bg-light-blue-400 text-white py-1 px-2 hover:bg-opacity-60" onClick={axiosClick}>Axios</button>
                <button class="bg-light-blue-400 text-white py-1 px-2 hover:bg-opacity-60" onClick={jqueryClick}>JQuery</button>
            </div>

            <div v-show={time.value > 0} class="text-lg text-light-blue-400">loading time:{time.value}ms</div>
            <div v-show={serverDelay.value > 0} class="text-lg text-light-blue-400">server delay:{serverDelay.value}ms</div>
            <div v-show={time.value - serverDelay.value > 0} class="text-lg text-light-blue-400">response time:{time.value - serverDelay.value}ms</div>


            <div v-show={endTime.value > 0}>
                {list.value.map(item => (
                    <div key={item}>{item}</div>
                ))}
            </div>

        </div>
    )
})
</script>
