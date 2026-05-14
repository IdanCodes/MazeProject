import PrimaryButton from "@src/components/buttons/PrimaryButton";

export default function StartGameButton({
  canStart,
  startGame,
}: {
  canStart: boolean;
  startGame: () => void;
}) {
  return (
    <>
      <PrimaryButton
        className="text-2xl bg-blue-500 my-1 hover:bg-blue-600/90 active:bg-blue-500/90"
        disabled={!canStart}
        onClick={startGame}
      >
        Start Game
      </PrimaryButton>
    </>
  );
}
