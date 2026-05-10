import { RedirectButton } from "@src/components/buttons/RedirectButton";
import PageTitle from "@src/components/PageTitle";
import { RoutePath } from "@src/constants/route-path";

export function Stats({ username }: { username: string }) {
  return (
    <>
      <PageTitle text={"Stats"} />
      <RedirectButton path={RoutePath.Home} className="text-3xl">
        Home
      </RedirectButton>
      <p className="text-3xl">The stats page is under construction</p>
    </>
  );
}
