import { TEXT_LIMITS } from "@fmbp/shared";
import { TextBox } from "@/components/ui";

/** The box that opens when someone chooses "Other" in a list: what they do, in their own words. */
export function OtherInput({ value, onChange, placeholder }: { value: string; onChange: (text: string) => void; placeholder: string }) {
  return (
    <TextBox value={value} onChangeText={onChange} maxLength={TEXT_LIMITS.profileOther} autoFocus tone="brand" placeholder={placeholder} accessibilityLabel={placeholder} />
  );
}
