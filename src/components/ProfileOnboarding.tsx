import { Onboarding } from "./Onboarding";
export function ProfileOnboarding(props: {
  userId: string;
  onBack: () => void;
}) {
  return <Onboarding {...props} mode="profile" />;
}
