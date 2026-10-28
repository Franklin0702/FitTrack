import { Settings } from "../screens";
import { useScreens } from "../screen-context";
export default function SettingsRoute() {
  const { settings } = useScreens();
  return settings ? <Settings {...settings} /> : null;
}
