import { Route, Routes } from "react-router-dom";
import "./index.css";
import Home from "./pages/Home";
import { RoutePath } from "@src/constants/route-path";
import Singleplayer from "@src/pages/gamemodes/Singleplayer";
import { Multiplayer } from "@src/pages/gamemodes/Multiplayer";
import React from "react";
import NetworkConnDemo from "@src/pages/Demos/NetworkConnDemo";

function App() {
  return (
    <div className="py-5">
      <Routes>
        <Route path={RoutePath.Home} element={<Home />} />
        <Route
          path={RoutePath.GameModes.Singleplayer}
          element={<Singleplayer />}
        />
        <Route
          path={RoutePath.GameModes.Multiplayer}
          element={<Multiplayer />}
        />
      </Routes>
    </div>
  );
  // return <NetworkConnDemo />;
}

export default App;
