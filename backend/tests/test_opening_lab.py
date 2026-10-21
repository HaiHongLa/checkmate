import pytest

from app.repositories.opening_repository import OpeningRepository


@pytest.fixture
def repo():
    return OpeningRepository()


def test_create_repertoire_and_line(repo):
    r = repo.create_repertoire("White e4", "white")
    line = repo.create_line(r.id, "Main line")
    plies = repo.replace_moves(
        line.id,
        [{"san": "e4"}, {"san": "e5"}, {"san": "Nf3"}],
    )
    assert len(plies) == 3
    assert plies[0].san == "e4"
    assert plies[0].is_key_position is True


def test_list_repertoires(repo):
    repo.create_repertoire("A", "white")
    assert len(repo.list_repertoires()) >= 1


@pytest.mark.asyncio
async def test_api_create_repertoire(client):
    response = await client.post(
        "/api/openings/repertoires",
        json={"name": "Sicilian prep", "color": "black"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Sicilian prep"
    assert data["color"] == "black"


@pytest.mark.asyncio
async def test_api_line_moves(client):
    rep = await client.post(
        "/api/openings/repertoires",
        json={"name": "Test", "color": "white"},
    )
    rep_id = rep.json()["id"]
    line = await client.post(
        f"/api/openings/repertoires/{rep_id}/lines",
        json={"name": "Line 1"},
    )
    line_id = line.json()["id"]
    updated = await client.put(
        f"/api/openings/lines/{line_id}/moves",
        json={"moves": [{"san": "d4"}, {"san": "d5"}]},
    )
    assert updated.status_code == 200
    assert len(updated.json()["plies"]) == 2


@pytest.mark.asyncio
async def test_generate_explanations_with_mock(client, monkeypatch):
    from app.services.opening_coach import OpeningCoachGenerator, LearnExplanationItem

    class FakeGen(OpeningCoachGenerator):
        async def generate_batch(self, *a, **k):
            plies = a[2]
            return [
                LearnExplanationItem(
                    ply_index=p.ply_index,
                    why_move="why",
                    strategic_idea="idea",
                    plan_text="plan",
                    watch_for="watch",
                    remember_this="remember",
                )
                for p in plies
            ]

    monkeypatch.setattr(
        "app.api.opening_lab.OpeningCoachGenerator",
        FakeGen,
    )

    rep = await client.post(
        "/api/openings/repertoires",
        json={"name": "Test2", "color": "white"},
    )
    rep_id = rep.json()["id"]
    line = await client.post(
        f"/api/openings/repertoires/{rep_id}/lines",
        json={"name": "Line"},
    )
    line_id = line.json()["id"]
    await client.put(
        f"/api/openings/lines/{line_id}/moves",
        json={"moves": [{"san": "e4"}]},
    )
    gen = await client.post(
        f"/api/openings/lines/{line_id}/generate-explanations",
        json={},
    )
    assert gen.status_code == 200
    assert len(gen.json()["explanations"]) == 1
