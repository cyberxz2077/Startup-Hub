import { Onboarding } from "./Onboarding";
export function ProjectOnboarding(props: {
  userId: string;
  projectId?: string;
  draftKey?: string;
  onBack: () => void;
}) {
  return <Onboarding {...props} mode="project" />;
}
