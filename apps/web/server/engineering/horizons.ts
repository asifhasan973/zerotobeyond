import {
  horizonsQuery,
  isMissionDate,
  parseHorizons,
} from "../../../../packages/engine/src/engineering/horizons.ts";
/** Fixed NASA upstream: no arbitrary URL, credential, or client-supplied Horizons command. */
export async function handleEngineeringHorizons(
  request: Request,
  fetcher: typeof fetch = fetch,
): Promise<Response> {
  const reply = (body: unknown, status: number) =>
    Response.json(body, {
      status,
      headers: {
        "Cache-Control": status === 200 ? "public, max-age=3600" : "no-store",
      },
    });
  if (request.method !== "GET")
    return new Response("Method not allowed", {
      status: 405,
      headers: { Allow: "GET" },
    });
  const date = new URL(request.url).searchParams.get("date");
  if (!isMissionDate(date))
    return reply(
      { error: "Choose a valid date between 2000 and 2099 (TDB)." },
      400,
    );
  try {
    const response = await fetcher(horizonsQuery(date), {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) throw new Error("NASA upstream unavailable");
    const text = await response.text();
    if (text.length > 100000) throw new Error("NASA response too large");
    return reply(
      parseHorizons(JSON.parse(text), date, new Date().toISOString()),
      200,
    );
  } catch {
    return reply(
      {
        error:
          "NASA Horizons is temporarily unavailable. Use the dated bundled reference or retry the request.",
      },
      502,
    );
  }
}
