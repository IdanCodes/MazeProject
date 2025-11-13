import React from "react";
import PageTitle from "../components/PageTitle";
import PrimaryButton from "../components/buttons/PrimaryButton";
import { ButtonSize } from "../components/buttons/ButtonSize";

function Home() {
  return (
    <>
      <div className="py-15">
        <PageTitle text="Maze Game" />
        <div className="flex flex-col justify-center w-3/10 py-20 mx-auto">
          <PrimaryButton text="Connect To Game" buttonSize={ButtonSize.Large} />
        </div>
      </div>
    </>
  );
}

export default Home;
