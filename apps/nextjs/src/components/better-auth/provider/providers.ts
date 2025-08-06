import { Icons } from "@board-games/ui/icons";

export const SocialProviders = [
  {
    provider: "github",
    name: "GitHub",
    icon: Icons.gitHub,
  },
  {
    provider: "google",
    name: "Google",
    icon: Icons.google,
  },
];
export type Provider = (typeof SocialProviders)[number];
