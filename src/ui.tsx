import React from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
} from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

export const C = {
  bg: "#F6F8F5",
  white: "#FFFFFF",
  ink: "#193C32",
  muted: "#7A8982",
  green: "#27775A",
  mint: "#E7F1E9",
  lime: "#DCEEA9",
  line: "#E6EBE6",
  coral: "#D88768",
  blue: "#649CB0",
  violet: "#9785AE",
  yellow: "#D7AF5B",
  danger: "#B84C48",
};
export function Icon({
  name,
  size = 21,
  color = C.ink,
}: {
  name: string;
  size?: number;
  color?: string;
}) {
  const paths: Record<string, React.ReactNode> = {
    grid: (
      <>
        <Path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" />
      </>
    ),
    book: (
      <>
        <Path d="M4 3h13a3 3 0 0 1 3 3v15H6a3 3 0 0 1-3-3V5a2 2 0 0 1 2-2M3 17h17M8 7h8M8 11h6" />
      </>
    ),
    chart: (
      <>
        <Path d="M4 3v17h17M8 15l4-5 4 3 5-8" />
      </>
    ),
    user: (
      <>
        <Circle cx="12" cy="8" r="4" />
        <Path d="M4 21v-2a8 8 0 0 1 16 0v2" />
      </>
    ),
    plus: <Path d="M12 5v14M5 12h14" />,
    chevron: <Path d="m9 5 7 7-7 7" />,
    left: <Path d="m15 5-7 7 7 7" />,
    down: <Path d="m6 9 6 6 6-6" />,
    close: <Path d="m6 6 12 12M18 6 6 18" />,
    check: <Path d="m5 12 4 4L19 6" />,
    leaf: (
      <>
        <Path d="M20 3C9 1 2 6 4 14s18 8 16-11ZM5 19l10-10M9 15v-4" />
      </>
    ),
    drop: <Path d="M12 3C9 7 5 11 5 15a7 7 0 0 0 14 0c0-4-4-8-7-12Z" />,
    fire: (
      <Path d="M13 2s1 6-3 8c0 0-2-1-2-3-7 7-3 15 4 15S24 14 17 7c0 4-2 5-2 5s2-6-2-10Z" />
    ),
    freeze: (
      <Path d="M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7M9 4l3 3 3-3M9 20l3-3 3 3M4 10l4-1-1-4M17 19l-1-4 4-1M4 14l4 1-1 4M17 5l-1 4 4 1" />
    ),
    activity: <Path d="M2 12h5l3-9 4 18 3-9h5" />,
    scale: (
      <>
        <Path d="M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2ZM8 8a6 6 0 0 1 8 0l-4 5Z" />
      </>
    ),
    bell: (
      <>
        <Path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
      </>
    ),
    shield: (
      <>
        <Path d="m12 2 9 4v6c0 6-9 10-9 10S3 18 3 12V6ZM8 12l3 3 5-6" />
      </>
    ),
    download: (
      <>
        <Path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" />
      </>
    ),
    upload: (
      <>
        <Path d="M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5" />
      </>
    ),
    trash: (
      <>
        <Path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7" />
      </>
    ),
    edit: (
      <>
        <Path d="m15 3 6 6L9 21H3v-6ZM12 6l6 6" />
      </>
    ),
    sun: (
      <>
        <Circle cx="12" cy="12" r="4" />
        <Path d="M12 1v2M12 21v2M1 12h2M21 12h2M4 4l2 2M18 18l2 2M4 20l2-2M18 6l2-2" />
      </>
    ),
  };
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name] ?? paths.leaf}
    </Svg>
  );
}
export function Label({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: any;
}) {
  return <Text style={[s.label, style]}>{children}</Text>;
}
export function Heading({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: any;
}) {
  return <Text style={[s.heading, style]}>{children}</Text>;
}
export function Muted({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: any;
}) {
  return <Text style={[s.muted, style]}>{children}</Text>;
}
export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
}) {
  return <View style={[s.card, style]}>{children}</View>;
}
export function Button({
  children,
  onPress,
  secondary,
  danger,
  icon,
  small,
  disabled,
  busy,
  expanded,
}: {
  children: string;
  onPress: () => void;
  secondary?: boolean;
  danger?: boolean;
  icon?: string;
  small?: boolean;
  disabled?: boolean;
  busy?: boolean;
  expanded?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={expanded === undefined ? undefined : { expanded }}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed, hovered }: any) => [
        s.button,
        secondary && s.secondary,
        danger && { backgroundColor: C.danger },
        small && { paddingVertical: 10, paddingHorizontal: 14 },
        (pressed || hovered) && { opacity: 0.8 },
        (disabled || busy) && { opacity: 0.45 },
      ]}
    >
      {busy ? (
        <ActivityIndicator size="small" color={secondary ? C.green : "white"} />
      ) : icon ? (
        <Icon name={icon} size={17} color={secondary ? C.green : "white"} />
      ) : null}
      <Text style={[s.buttonText, secondary && { color: C.green }]}>
        {children}
      </Text>
    </Pressable>
  );
}
export function IconButton({
  name,
  onPress,
  label,
  disabled,
  color,
}: {
  name: string;
  onPress: () => void;
  label: string;
  disabled?: boolean;
  color?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={7}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.iconButton,
        pressed && { backgroundColor: C.mint },
        disabled && { opacity: 0.25 },
      ]}
    >
      <Icon name={name} color={color} size={18} />
    </Pressable>
  );
}
export function Field({
  label,
  value,
  onChange,
  placeholder,
  numeric,
  multiline,
  suffix,
  editable = true,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  numeric?: boolean;
  multiline?: boolean;
  suffix?: string;
  editable?: boolean;
}) {
  return (
    <View style={{ flex: 1, minWidth: 110, gap: 8 }}>
      <Label>{label}</Label>
      <View
        style={[
          s.inputWrap,
          !editable && { backgroundColor: "#EBEEEB", opacity: 0.65 },
        ]}
      >
        <TextInput
          accessibilityLabel={label}
          accessibilityState={{ disabled: !editable }}
          editable={editable}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor="#97A29C"
          keyboardType={numeric ? "decimal-pad" : "default"}
          multiline={multiline}
          maxLength={multiline ? 2000 : 100}
          style={[
            s.input,
            multiline && { minHeight: 90, textAlignVertical: "top" },
          ]}
        />
        {suffix && (
          <Muted style={{ paddingRight: 12, fontSize: 12 }}>{suffix}</Muted>
        )}
      </View>
    </View>
  );
}
export function Chip({
  children,
  selected,
  onPress,
}: {
  children: string;
  selected?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        s.chip,
        selected && { backgroundColor: C.ink, borderColor: C.ink },
      ]}
    >
      <Text
        style={{
          color: selected ? "white" : C.muted,
          fontSize: 12,
          fontWeight: "600",
        }}
      >
        {children}
      </Text>
    </Pressable>
  );
}
export function Bar({
  value,
  max,
  color = C.green,
}: {
  value: number;
  max: number;
  color?: string;
}) {
  return (
    <View style={s.bar}>
      <View
        style={{
          width: `${Math.min(100, Math.max(0, (value / max) * 100))}%`,
          backgroundColor: color,
          borderRadius: 10,
          height: "100%",
        }}
      />
    </View>
  );
}
export function Ring({
  value,
  max,
  size = 184,
  children,
}: {
  value: number;
  max: number;
  size?: number;
  children?: React.ReactNode;
}) {
  const radius = (size - 14) / 2,
    circumference = 2 * Math.PI * radius;
  return (
    <View
      style={{
        width: size,
        height: size,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#E9EEE5"
          strokeWidth={11}
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={value > max ? C.coral : C.green}
          strokeWidth={11}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - Math.min(value / max, 1))}
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
          strokeLinecap="round"
        />
      </Svg>
      {children}
    </View>
  );
}
export function Sheet({
  title,
  subtitle,
  children,
  onClose,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={s.overlay}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Close dialog"
        />
        <View accessibilityViewIsModal style={s.sheet}>
          <View
            style={[
              s.row,
              { justifyContent: "space-between", alignItems: "flex-start" },
            ]}
          >
            <View style={{ flex: 1, gap: 5 }}>
              <Heading style={{ fontSize: 23 }}>{title}</Heading>
              {subtitle && <Muted>{subtitle}</Muted>}
            </View>
            <IconButton name="close" onPress={onClose} label="Close dialog" />
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              paddingTop: 24,
              gap: 20,
              paddingBottom: 4,
            }}
          >
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
export function Empty({
  icon = "leaf",
  title,
  detail,
  action,
  onPress,
}: {
  icon?: string;
  title: string;
  detail: string;
  action?: string;
  onPress?: () => void;
}) {
  return (
    <View style={{ alignItems: "center", padding: 24, gap: 10 }}>
      <View style={[s.iconTile, { backgroundColor: C.mint, marginBottom: 3 }]}>
        <Icon name={icon} color={C.green} />
      </View>
      <Heading style={{ fontSize: 16, textAlign: "center" }}>{title}</Heading>
      <Muted style={{ textAlign: "center", maxWidth: 300 }}>{detail}</Muted>
      {action && onPress && (
        <View style={{ marginTop: 8 }}>
          <Button secondary small onPress={onPress} icon="plus">
            {action}
          </Button>
        </View>
      )}
    </View>
  );
}
export const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  card: {
    backgroundColor: C.white,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: C.line,
  },
  heading: {
    fontSize: 19,
    fontWeight: "700",
    color: C.ink,
    letterSpacing: -0.5,
  },
  label: { color: C.ink, fontSize: 13, fontWeight: "600" },
  muted: { color: C.muted, fontSize: 13, lineHeight: 20 },
  button: {
    borderRadius: 12,
    backgroundColor: C.green,
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 42,
  },
  secondary: { backgroundColor: C.mint },
  buttonText: { fontSize: 13, fontWeight: "600", color: C.white },
  iconButton: {
    width: 34,
    height: 34,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 9,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderColor: C.line,
    borderWidth: 1,
    borderRadius: 10,
    backgroundColor: "#FAFCF9",
  },
  input: {
    flex: 1,
    minWidth: 0,
    padding: 13,
    fontSize: 15,
    color: C.ink,
    ...(Platform.OS === "web" ? { outlineStyle: "none" as any } : {}),
  },
  chip: {
    borderRadius: 9,
    paddingVertical: 9,
    paddingHorizontal: 13,
    backgroundColor: C.white,
    borderColor: C.line,
    borderWidth: 1,
  },
  bar: {
    height: 7,
    borderRadius: 10,
    backgroundColor: "#EDF0EB",
    overflow: "hidden",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(16, 40, 30, 0.35)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  sheet: {
    backgroundColor: "white",
    width: "100%",
    maxWidth: 560,
    maxHeight: "90%",
    padding: 26,
    borderRadius: 24,
    boxShadow: "0 20px 80px rgba(20, 45, 30, 0.14)",
  },
  iconTile: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  divider: { height: 1, backgroundColor: C.line },
});
