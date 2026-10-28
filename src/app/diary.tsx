import { Diary } from "../screens";
import { useScreens } from "../screen-context";
export default function DiaryRoute() {
  const { screen } = useScreens();
  return screen ? <Diary {...screen} /> : null;
}
