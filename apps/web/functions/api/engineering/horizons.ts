import { handleEngineeringHorizons } from "../../../server/engineering/horizons";
export const onRequest = (context: { request: Request }) =>
  handleEngineeringHorizons(context.request);
