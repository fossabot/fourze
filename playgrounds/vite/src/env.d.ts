/// <reference types="vite/client" />



interface ImportMetaEnv {
  readonly APP_TOKEN: string
  PROD: boolean;
  DEV: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}


import { Events} from "vue";

type EventHandlers<E> = {
  [K in keyof E]?: E[K] extends (...args: any) => any
    ? E[K]
    : (payload: E[K]) => void;
};

declare module "vue" {
  interface ComponentCustomProps extends EventHandlers<Events> {}
}

declare module "vue" {
  interface ComponentCustomProperties {


  }
}
