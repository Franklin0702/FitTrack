import { createContext, useContext } from "react";
import type { ComponentProps } from "react";
import type { ScreenProps, Settings } from "./screens";

export const ScreenContext = createContext<{
  screen: ScreenProps | null;
  settings: ComponentProps<typeof Settings> | null;
  onMigrate: () => void;
}>({ screen: null, settings: null, onMigrate: () => {} });
export const useScreens = () => useContext(ScreenContext);
