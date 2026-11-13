import { handleTutor, type TutorEnv } from "../../apps/web/server/tutor";
export const onRequest = (context: { request: Request; env: TutorEnv }) =>
  handleTutor(context.request, context.env);
