import { Progress } from "../screens";
import { useScreens } from "../screen-context";
export default function ProgressRoute() {
  const { screen } = useScreens();
  return screen ? <Progress {...screen} /> : null;
}
