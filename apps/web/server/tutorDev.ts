import type { Plugin } from "vite";
import { loadEnv } from "vite";
import { handleTutor } from "./tutor";
export function tutorDev(): Plugin {
  let env: Record<string, string> = {};
  return {
    name: "space-tutor-local-api",
    configResolved(config) {
      env = {
        ...loadEnv(config.mode, config.envDir, ""),
        ...loadEnv(config.mode, process.cwd(), ""),
        ...process.env,
      } as Record<string, string>;
    },
    configureServer(server) {
      server.middlewares.use("/api/tutor", async (req, res) => {
        let body = "";
        try {
          for await (const chunk of req) {
            body += chunk;
            if (body.length > 24000) {
              res.writeHead(413);
              res.end();
              return;
            }
          }
          const headers = new Headers();
          for (const [k, v] of Object.entries(req.headers))
            if (typeof v === "string") headers.set(k, v);
          const response = await handleTutor(
            new Request(`http://${req.headers.host}/api/tutor`, {
              method: req.method,
              headers,
              ...(req.method === "POST" ? { body } : {}),
            }),
            env,
          );
          res.writeHead(
            response.status,
            Object.fromEntries(response.headers.entries()),
          );
          res.end(await response.text());
        } catch {
          res.writeHead(500);
          res.end(
            JSON.stringify({ error: "The tutor is temporarily unavailable." }),
          );
        }
      });
    },
  };
}
