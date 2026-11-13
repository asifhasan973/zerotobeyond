import { createContext, useContext } from "react";
export const LearningStepContext = createContext<string | undefined>(undefined);
export const useLearningStep = () => useContext(LearningStepContext);
