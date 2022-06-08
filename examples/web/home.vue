<script lang="tsx">
import axios from "axios"
import { defineComponent, ref } from "vue"
import $ from "jquery"

export default defineComponent(() => {
    const list = ref<any[]>([])
    function fetchClick() {
        fetch(`/search/${Math.floor(Math.random() * 9)}`, { method: "post", body: JSON.stringify({ phone: 2 }) })
            .then(r => r.json())
            .then(r => {
                list.value = Array.isArray(r) ? r : Object.entries(r)
            })
    }

    function xhrClick() {
        axios
            .post(`/search/${Math.floor(Math.random() * 9)}`, { phone: 2 })
            .then(r => {
                return r.data
            })
            .then(r => (list.value = Array.isArray(r) ? r : Object.entries(r)))
    }

    function jqueryClick() {
        $.ajax({
            url: `/search/${Math.floor(Math.random() * 9)}`,
            method: "POST",
            data: JSON.stringify({ phone: 2 }),
            dataType: "json",
            contentType: "application/json",
            success(r) {
                list.value = Array.isArray(r) ? r : Object.entries(r)
            },
            error(r) {
                console.error(r)
            }
        })
    }
    return () => (
        <div>
            <img style={{ width: "120px", height: "120px" }} src="/stat/test.jpg" />
            <div>
                <button onClick={fetchClick}>Fetch!</button>
                <button onClick={xhrClick}>XHR!</button>
                <button onClick={jqueryClick}>JQuery!</button>
            </div>

            {list.value.map(item => (
                <div key={item}>{item}</div>
            ))}
        </div>
    )
})
</script>
