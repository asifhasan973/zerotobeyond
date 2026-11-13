import type { Plugin } from "vite";
import { handleEngineeringHorizons } from "./horizons";
export function engineeringDev(): Plugin {
  return {
    name: "engineering-horizons-api",
    configureServer(server) {
      server.middlewares.use("/api/engineering/horizons", async (req, res) => {
        const response = await handleEngineeringHorizons(
          new Request(
            `http://localhost/api/engineering/horizons${req.url ?? ""}`,
            { method: req.method },
          ),
        );
        res.writeHead(
          response.status,
          Object.fromEntries(response.headers.entries()),
        );
        res.end(await response.text());
      });
    },
  };
}
