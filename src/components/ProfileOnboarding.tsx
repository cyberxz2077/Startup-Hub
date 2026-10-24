import { Onboarding } from "./Onboarding";
export function ProfileOnboarding(props: {
  userId: string;
  onBack: () => void;
  onSwitch: () => void;
}) {
  return <Onboarding {...props} mode="profile" />;
}
