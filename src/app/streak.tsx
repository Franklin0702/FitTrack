import { StreakScreen } from "../streak-ui";
import { useScreens } from "../screen-context";
export default function StreakRoute() {
  const { screen, onMigrate } = useScreens();
  return screen ? <StreakScreen {...screen} onMigrate={onMigrate} /> : null;
}
