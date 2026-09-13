import { View } from "react-native";
import { Chip } from "./Chip";

export type ChipOption = { value: string; label: string; icon?: string };

type Single = { multiple?: false; value?: string | null; onChange: (v: string) => void };
type Multi = { multiple: true; value?: string[]; onChange: (v: string[]) => void };

export function ChipGroup({ options, ...p }: { options: ChipOption[] } & (Single | Multi)) {
  const isSel = (v: string) => (p.multiple ? (p.value ?? []).includes(v) : p.value === v);
  const toggle = (v: string) => {
    if (p.multiple) {
      const cur = p.value ?? [];
      p.onChange(cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]);
    } else {
      p.onChange(v);
    }
  };
  return (
    <View className="flex-row flex-wrap gap-2">
      {options.map((o) => (
        <Chip key={o.value} label={o.label} icon={o.icon} selected={isSel(o.value)} onPress={() => toggle(o.value)} />
      ))}
    </View>
  );
}
