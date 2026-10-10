import { auth, defineMcp } from "@lovable.dev/mcp-js";
import searchJobs from "./tools/search-jobs";
import searchSeekers from "./tools/search-seekers";
import myNotifications from "./tools/my-notifications";

const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "pixel-perfect",
  title: "Pixel Perfect",
  version: "0.1.0",
  instructions: "Tools for Qahwaty, a Moroccan café and restaurant jobs platform: search open jobs, search registered talent, and read your notifications.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [searchJobs, searchSeekers, myNotifications],
});
