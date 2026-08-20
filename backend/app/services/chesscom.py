import io
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any
from urllib.parse import urlparse

import chess.pgn
import httpx

CHESSCOM_BASE = "https://api.chess.com/pub"
USERNAME_PATTERN = re.compile(r"^[a-zA-Z0-9_-]{3,50}$")


class ChessComError(Exception):
    """Base error for Chess.com integration."""

    def __init__(self, message: str, status_code: int = 502) -> None:
        super().__init__(message)
        self.status_code = status_code


class ChessComUserNotFoundError(ChessComError):
    def __init__(self, username: str) -> None:
        super().__init__(f"Chess.com user '{username}' was not found.", status_code=404)


class ChessComRateLimitError(ChessComError):
    def __init__(self) -> None:
        super().__init__(
            "Chess.com rate limit reached. Please try again in a moment.",
            status_code=429,
        )


class ChessComUnavailableError(ChessComError):
    def __init__(self, detail: str = "Chess.com API is temporarily unavailable.") -> None:
        super().__init__(detail, status_code=503)


@dataclass
class ChessComPlayer:
    """Resolved Chess.com player profile."""

    canonical_username: str  # API username (usually lowercase)
    display_username: str  # Preferred casing from Chess.com profile URL


def _display_username_from_profile(data: dict[str, Any], fallback: str) -> str:
    url = data.get("url", "")
    if isinstance(url, str) and "/member/" in url:
        return url.rstrip("/").split("/member/")[-1]
    api_username = data.get("username")
    if isinstance(api_username, str) and api_username:
        return api_username
    return fallback


@dataclass
class ChessComGame:
    id: str
    date: str
    white: str
    black: str
    result: str
    time_control: str | None
    pgn: str
    url: str
    opening: str | None
    user_color: str | None


def validate_username(username: str) -> str:
    cleaned = username.strip()
    if not USERNAME_PATTERN.match(cleaned):
        raise ChessComError(
            "Invalid Chess.com username. Use 3-50 letters, numbers, underscores, or hyphens.",
            status_code=400,
        )
    return cleaned


def _parse_opening_from_pgn(pgn: str) -> str | None:
    try:
        game = chess.pgn.read_game(io.StringIO(pgn))
    except Exception:
        return None
    if game is None:
        return None
    headers = game.headers
    return headers.get("Opening") or headers.get("ECO")


def _extract_game_id(url: str) -> str:
    path = urlparse(url).path.rstrip("/")
    return path.split("/")[-1] if path else url


def _format_date(end_time: int | None) -> str:
    if end_time is None:
        return "Unknown date"
    return datetime.fromtimestamp(end_time, tz=timezone.utc).strftime("%b %d, %Y")


def _format_time_control(raw: str | None) -> str | None:
    if not raw:
        return None
    if raw.isdigit():
        seconds = int(raw)
        if seconds < 180:
            return "Bullet"
        if seconds < 600:
            return "Blitz"
        if seconds < 1800:
            return "Rapid"
        return "Classical"
    if "+" in raw:
        base = raw.split("+", 1)[0]
        if base.isdigit():
            return _format_time_control(base)
    return raw


def _normalize_game(raw: dict[str, Any], username: str) -> ChessComGame | None:
    pgn = raw.get("pgn")
    if not pgn or not isinstance(pgn, str):
        return None

    white = raw.get("white", {})
    black = raw.get("black", {})
    white_name = white.get("username", "Unknown") if isinstance(white, dict) else "Unknown"
    black_name = black.get("username", "Unknown") if isinstance(black, dict) else "Unknown"

    user_lower = username.lower()
    user_color = None
    if white_name.lower() == user_lower:
        user_color = "white"
    elif black_name.lower() == user_lower:
        user_color = "black"

    url = raw.get("url", "")
    return ChessComGame(
        id=_extract_game_id(url) if url else f"{white_name}-{black_name}-{raw.get('end_time', '')}",
        date=_format_date(raw.get("end_time")),
        white=white_name,
        black=black_name,
        result=raw.get("result", "*"),
        time_control=_format_time_control(raw.get("time_control")),
        pgn=pgn,
        url=url,
        opening=_parse_opening_from_pgn(pgn),
        user_color=user_color,
    )


class ChessComService:
    """Fetches and normalizes games from Chess.com's public API."""

    def __init__(self, client: httpx.AsyncClient | None = None) -> None:
        self._client = client
        self._owns_client = client is None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(
                base_url=CHESSCOM_BASE,
                timeout=httpx.Timeout(15.0),
                headers={"User-Agent": "Checkmate/1.0"},
                follow_redirects=True,
            )
        return self._client

    async def close(self) -> None:
        if self._owns_client and self._client is not None:
            await self._client.aclose()
            self._client = None

    async def _request_json(
        self,
        path: str,
        *,
        not_found_message: str | None = None,
    ) -> dict[str, Any]:
        client = await self._get_client()
        try:
            response = await client.get(path)
        except httpx.RequestError as exc:
            raise ChessComUnavailableError(
                f"Could not reach Chess.com: {exc}"
            ) from exc

        if response.status_code == 404:
            if not_found_message:
                raise ChessComUserNotFoundError(not_found_message)
            return {}
        if response.status_code == 429:
            raise ChessComRateLimitError()
        if response.status_code >= 500:
            raise ChessComUnavailableError()
        if response.status_code >= 400:
            raise ChessComError(
                f"Chess.com request failed ({response.status_code}).",
                status_code=502,
            )

        try:
            return response.json()
        except ValueError as exc:
            raise ChessComUnavailableError("Chess.com returned invalid JSON.") from exc

    async def resolve_player(self, username: str) -> ChessComPlayer:
        """Resolve a username to Chess.com's canonical profile (handles mixed case)."""
        cleaned = validate_username(username)
        data = await self._request_json(
            f"/player/{cleaned}",
            not_found_message=cleaned,
        )
        canonical = data.get("username", cleaned)
        if not isinstance(canonical, str) or not canonical:
            canonical = cleaned
        display = _display_username_from_profile(data, cleaned)
        return ChessComPlayer(
            canonical_username=canonical,
            display_username=display,
        )

    async def player_exists(self, username: str) -> ChessComPlayer:
        return await self.resolve_player(username)

    async def fetch_archives(self, username: str) -> list[str]:
        validate_username(username)
        data = await self._request_json(f"/player/{username}/games/archives")
        archives = data.get("archives", [])
        if not isinstance(archives, list):
            return []
        return [url for url in archives if isinstance(url, str)]

    async def fetch_games_from_archive(self, archive_url: str) -> list[dict[str, Any]]:
        parsed = urlparse(archive_url)
        path = parsed.path
        if not path.startswith("/pub/"):
            raise ChessComError("Invalid Chess.com archive URL.", status_code=400)
        api_path = path.removeprefix("/pub")
        data = await self._request_json(api_path)
        games = data.get("games", [])
        if not isinstance(games, list):
            return []
        return [game for game in games if isinstance(game, dict)]

    async def fetch_recent_games(
        self,
        username: str,
        *,
        limit: int = 20,
    ) -> tuple[ChessComPlayer, list[ChessComGame]]:
        player = await self.resolve_player(username)
        canonical = player.canonical_username

        archives = await self.fetch_archives(canonical)
        if not archives:
            return player, []

        normalized: list[ChessComGame] = []
        for archive_url in reversed(archives):
            raw_games = await self.fetch_games_from_archive(archive_url)
            for raw in reversed(raw_games):
                game = _normalize_game(raw, canonical)
                if game is not None:
                    normalized.append(game)
                if len(normalized) >= limit:
                    return player, normalized

        return player, normalized
