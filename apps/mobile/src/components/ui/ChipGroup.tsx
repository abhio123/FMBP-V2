import { View } from "react-native";
import { Chip } from "./Chip";

import type { InfoContent } from "./InfoDialog";

/**
 * `hint`: a second, smaller line in long pickers; `keywords`: extra words search matches (Hindi, Hinglish, other
 * names), never shown; `info`: what this choice covers, behind an ⓘ in long pickers (e.g. what a category includes).
 */
export type ChipOption = { value: string; label: string; icon?: string; hint?: string; keywords?: string; info?: InfoContent };

/** Single select: tapping the selected chip clears it (null). Multi: toggles membership. */
type Single = { multiple?: false; value?: string | null; onChange: (v: string | null) => void };
type Multi = { multiple: true; value?: string[]; onChange: (v: string[]) => void };

export function ChipGroup({ options, ...p }: { options: ChipOption[] } & (Single | Multi)) {
  const isSel = (v: string) => (p.multiple ? (p.value ?? []).includes(v) : p.value === v);
  const toggle = (v: string) => {
    if (p.multiple) {
      const cur = p.value ?? [];
      p.onChange(cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]);
    } else {
      p.onChange(p.value === v ? null : v);
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
