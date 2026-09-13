import { Pressable, ActivityIndicator, View } from "react-native";
import { Text } from "./Text";

type Props = {
  title: string;
  onPress?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  disabled?: boolean;
  loading?: boolean;
  full?: boolean;
  className?: string;
};

const styles = {
  primary: { box: "bg-brand", text: "text-white" },
  secondary: { box: "bg-brand-light", text: "text-brand-dark" },
  ghost: { box: "bg-transparent", text: "text-brand" },
  danger: { box: "bg-danger", text: "text-white" },
};

export function Button({ title, onPress, variant = "primary", disabled, loading, full = true, className = "" }: Props) {
  const s = styles[variant];
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      className={`min-h-[48px] items-center justify-center rounded-xl px-5 ${s.box} ${disabled ? "opacity-40" : ""} ${full ? "w-full" : "self-start"} ${className}`}
    >
      <View className="flex-row items-center gap-2">
        {loading && <ActivityIndicator color={variant === "primary" || variant === "danger" ? "#fff" : "#1F6F5F"} />}
        <Text className={`text-base font-semibold ${s.text}`}>{title}</Text>
      </View>
    </Pressable>
  );
}
