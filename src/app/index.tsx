import { Overview } from "../screens";
import { useScreens } from "../screen-context";
export default function OverviewRoute() {
  const { screen } = useScreens();
  return screen ? <Overview {...screen} /> : null;
}
