import { formatGameClock } from "./gameClock";
import type { LiveState } from "./types";

type Props = {
  live: LiveState | null;
  compact?: boolean;
};

function prettyState(value: string | null | undefined): string {
  if (!value) return "waiting";
  return value.replace("DOTA_GAMERULES_STATE_", "").replace(/_/g, " ").toLowerCase();
}

export function PickPhaseBanner({ live, compact }: Props) {
  if (!live?.connected) return null;
  const phase = live.pickPhase;
  const drafting = Boolean(phase?.isDraft);
  const inGame = /GAME_IN_PROGRESS|PRE_GAME|POST_GAME/i.test(live.gameState ?? "");
  if (!drafting && (inGame || !live.draft)) return null;

  const action = phase?.action === "ban" ? "BAN" : phase?.action === "pick" ? "PICK" : drafting ? "DRAFT" : "LOCKED";
  const turn =
    phase?.yourTurn
      ? "your turn"
      : phase?.activeTeam
        ? `${phase.activeTeam} turn`
        : prettyState(live.gameState);
  const you = live.playerTeam ? `You are ${live.playerTeam}` : "Side unknown — tap Radiant/Dire if needed";
  const clock =
    phase?.timeRemaining != null ? formatGameClock(phase.timeRemaining) : null;

  return (
    <div className={`pick-phase ${phase?.yourTurn ? "yours" : ""} ${phase?.action ?? ""}`}>
      <div className="pick-phase-main">
        <span className="pick-action">{action}</span>
        {clock && <span className="pick-clock">{clock}</span>}
        <span className="pick-turn">
          {turn}
          {compact && live.playerTeam ? ` · ${live.playerTeam}` : ""}
        </span>
      </div>
      {!compact && (
        <p className="muted">
          {you}. Your locked hero and any teammates Valve includes fill automatically.
          {live.draft ? "" : " Ranked All Pick usually hides the enemy roster in GSI"}
          — drop missing slots in by hand.
        </p>
      )}
    </div>
  );
}
