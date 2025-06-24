import { KomodoClient } from "komodo_client";
import { env } from "./env.js";

export const komodo = KomodoClient(env.komodoUrl, {
  type: "api-key",
  params: {
    key: env.komodoKey,
    secret: env.komodoSecret,
  },
});
