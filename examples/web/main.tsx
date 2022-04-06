import { createApp, renderList, ref, defineComponent } from "vue";
import axios from "axios";

const app = createApp(
  defineComponent(() => {
    const list = ref<any[]>();

    function search() {
      axios("/api/search")
        .then((r) => r.data)
        .then((r) => (list.value = r));
    }

    return () => (
      <div>
        <button onClick={search}>Click Me!</button>
        {renderList(list.value, (item) => (
          <div>{item}</div>
        ))}
      </div>
    );
  })
);

app.mount("#app");
