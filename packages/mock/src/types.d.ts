import { FourzeMockApp } from "./shared";

declare global {
  var __FOURZE_MOCK_APP__: FourzeMockApp;

  var __FOURZE_VERSION__: string;
}

export {}
