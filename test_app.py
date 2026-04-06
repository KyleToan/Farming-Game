import pytest
from app import app

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

def test_index_returns_200(client):
    response = client.get('/')
    assert response.status_code == 200

def test_index_contains_game_elements(client):
    response = client.get('/')
    html = response.data.decode('utf-8')
    assert 'harvest-btn' in html
    assert 'upgrades-panel' in html
    assert 'animals-panel' in html
    assert 'money-counter' in html
    assert 'upgrades.js' in html
    assert 'prestige.js' in html
    assert 'save.js' in html
    assert 'animals.js' in html
    assert 'game.js' in html

def test_static_js_files_served(client):
    for filename in ['game.js', 'upgrades.js', 'prestige.js', 'save.js', 'animals.js', 'style.css']:
        response = client.get(f'/static/{filename}')
        assert response.status_code == 200, f'{filename} should be served'
