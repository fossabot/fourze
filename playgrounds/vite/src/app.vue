<template>
    <div class="px-4">
        <div class="">
            <div class=" font-bold py-2 text-2xl text-light-blue-400">Image Upload/Load</div>

            <div class="flex space-x-4 items-center">
                <img :style="{ width: '120px' , height:'120px' }" :src="avatarUrl" />
                <div>
                    <button class="bg-light-blue-400 text-white py-1 px-2 hover:bg-opacity-60"
                        @click="upload">Upload</button>
                </div>

            </div>
        </div>

        <div class="flex space-x-8 mt-8">
            <div>
                <div class=" font-bold py-2 text-2xl text-light-blue-400">XHR/FETCH GET</div>

                <div class="flex space-x-4 py-2 items-center">
                    <button class="bg-light-blue-400 text-white py-1 px-2 hover:bg-opacity-60"
                        @click="handleFetch">Fetch</button>
                    <button class="bg-light-blue-400 text-white py-1 px-2 hover:bg-opacity-60"
                        @click="handleAxios">Axios</button>
                    <button class="bg-light-blue-400 text-white py-1 px-2 hover:bg-opacity-60"
                        @click="handleJQuery">JQuery</button>
                </div>
                <div class="flex space-x-4 ">
                    <textarea readonly :value="jsonResult" class="bg-gray-200 h-100 p-2 w-120"></textarea>
                    <div class="w-100">
                        <div v-show="time" class="text-lg text-light-blue-400">loading time:{{time}}ms</div>
                        <div v-show="serverDelay> 0" class="text-lg text-light-blue-400">server delay:{{serverDelay}}ms
                        </div>
                        <div v-show="time - serverDelay> 0" class="text-lg text-light-blue-400">response time:{{time -
                        serverDelay}}ms
                        </div>
                    </div>

                </div>
            </div>

            <div>
                <div class=" font-bold py-2 text-2xl text-light-blue-400">XHR/FETCH POST</div>
            </div>
        </div>

    </div>
</template>

<script setup lang="ts">
import { useNow } from "@vueuse/core"
import axios from "axios"
import $ from "jquery"
import type { MaybeAsyncFunction } from "maybe-types"
import { computed, ref } from "vue"

export interface ResponseData {
    code: number
    data: any
    msg: string
}

const t = ref(0)

const avatarUrl = computed(() => {
    return "/api/img/avatar.jpg?t=" + t.value
})


function upload() {
    const file = document.createElement("input")
    file.type = "file"
    file.onchange = async (e) => {
        if (file.files) {
            const formData = new FormData()
            formData.append("file", file.files[0])
            formData.append("name", "avatar")
            await axios.post("/api/upload/avatar", formData, {
                headers: {
                    "Content-Type": "multipart/form-data"
                }
            })
            t.value = new Date().getTime()
        }
    }
    file.click()
}


const result = ref<any>()

const jsonResult = computed(() => {
    return JSON.stringify(result.value, null, 4)
})


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

const recoding = (fn: MaybeAsyncFunction<void>) => {
    return async () => {
        startTime.value = Date.now()
        endTime.value = 0
        serverDelay.value = 0
        try {
            await fn()
        } catch (error) {
            result.value = error
        }
        endTime.value = Date.now()
    }
}

const handleFetch = recoding(async () => {
    result.value = await fetch(`/api/search/${Math.floor(Math.random() * 9)}`, { method: "post", body: JSON.stringify({ phone: 2 }) })
        .then(r => {
            serverDelay.value = Number(r.headers.get("Fourze-Delay"))
            return r.json()
        })
        .then(r => r.data)
})


const handleAxios = recoding(async () => {
    const rs = await axios.post(`/api/search/${Math.floor(Math.random() * 9)}`, { phone: 2 })
    serverDelay.value = Number(rs.headers["fourze-delay"])
    result.value = rs.data.data
})


const handleJQuery = recoding(async () => {
    await $.ajax({
        url: `/api/search/${Math.floor(Math.random() * 9)}`,
        type: "post",
        data: JSON.stringify({ phone: 2 }),
        contentType: "application/json",
        success: (data, status, jqXHR) => {
            serverDelay.value = Number(jqXHR.getResponseHeader("Fourze-Delay"))
            result.value = data.data
        }
    })

})






</script>
