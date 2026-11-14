import { useNavigate } from "react-router";

export type SitePage =
  | "home"
  | "mission"
  | "archive"
  | "engineering"
  | "atlas"
  | "signal"
  | "cosmic"
  | "roadmap";

export function useSiteNavigation() {
  const navigate = useNavigate();
  return (page: SitePage) => {
    if (page === "mission") window.location.assign("/?play=1");
    else void navigate(page === "home" ? "/" : `/?explore=${page}`);
  };
}
