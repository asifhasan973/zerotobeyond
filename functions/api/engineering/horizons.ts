import { handleEngineeringHorizons } from "../../../apps/web/server/engineering/horizons";
export const onRequest = (context: { request: Request }) =>
  handleEngineeringHorizons(context.request);
