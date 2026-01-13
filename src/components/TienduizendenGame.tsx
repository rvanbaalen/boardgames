import { useState, useEffect, useCallback } from 'react';

interface Player {
  id: string;
  name: string;
  score: number;
  history: { value: number; type: 'add' | 'subtract' | 'farkle' }[];
  color: string;
}

interface GameState {
  players: Player[];
  currentPlayerIndex: number;
}

const TARGET_SCORE = 10000;
const PLAYER_COLORS = ['#e94560', '#08d9d6', '#f9ed69', '#b537f2', '#06d6a0', '#ff6b6b'];
const QUICK_SCORES = [50, 100, 150, 200, 250, 300, 350, 500, 1000];

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export default function TienduizendenGame() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [scoreModal, setScoreModal] = useState<{
    isOpen: boolean;
    playerId: string | null;
    mode: 'add' | 'subtract';
  }>({ isOpen: false, playerId: null, mode: 'add' });
  const [currentScoreInput, setCurrentScoreInput] = useState('0');
  const [rulesModalOpen, setRulesModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [expandedHistory, setExpandedHistory] = useState<Set<string>>(new Set());
  const [confettiActive, setConfettiActive] = useState(false);

  // Load game from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('tienduizend');
    if (saved) {
      try {
        const data: GameState = JSON.parse(saved);
        setPlayers(data.players || []);
        setCurrentPlayerIndex(data.currentPlayerIndex || 0);
      } catch (e) {
        console.error('Failed to load game state:', e);
      }
    }
  }, []);

  // Save game to localStorage
  useEffect(() => {
    localStorage.setItem('tienduizend', JSON.stringify({
      players,
      currentPlayerIndex,
    }));
  }, [players, currentPlayerIndex]);

  const addPlayer = useCallback(() => {
    const playerNum = players.length + 1;
    setPlayers(prev => [...prev, {
      id: generateId(),
      name: `Speler ${playerNum}`,
      score: 0,
      history: [],
      color: PLAYER_COLORS[(playerNum - 1) % PLAYER_COLORS.length],
    }]);
  }, [players.length]);

  const deletePlayer = useCallback((id: string) => {
    setPlayers(prev => {
      const newPlayers = prev.filter(p => p.id !== id);
      if (currentPlayerIndex >= newPlayers.length && newPlayers.length > 0) {
        setCurrentPlayerIndex(0);
      }
      return newPlayers;
    });
  }, [currentPlayerIndex]);

  const updatePlayerName = useCallback((id: string, name: string) => {
    setPlayers(prev => prev.map(p =>
      p.id === id ? { ...p, name: name || 'Speler' } : p
    ));
  }, []);

  const openScoreModal = useCallback((playerId: string, mode: 'add' | 'subtract') => {
    setScoreModal({ isOpen: true, playerId, mode });
    setCurrentScoreInput('0');
  }, []);

  const closeScoreModal = useCallback(() => {
    setScoreModal({ isOpen: false, playerId: null, mode: 'add' });
  }, []);

  const appendDigit = useCallback((digit: string) => {
    setCurrentScoreInput(prev => {
      if (prev === '0') return digit;
      if (prev.length < 5) return prev + digit;
      return prev;
    });
  }, []);

  const clearScore = useCallback(() => setCurrentScoreInput('0'), []);

  const backspace = useCallback(() => {
    setCurrentScoreInput(prev =>
      prev.length > 1 ? prev.slice(0, -1) : '0'
    );
  }, []);

  const setQuickScore = useCallback((value: number) => {
    setCurrentScoreInput(value.toString());
  }, []);

  const nextTurn = useCallback(() => {
    if (players.length > 0) {
      setCurrentPlayerIndex(prev => (prev + 1) % players.length);
    }
  }, [players.length]);

  const celebrateWinner = useCallback(() => {
    setConfettiActive(true);
    setTimeout(() => setConfettiActive(false), 3000);
  }, []);

  const confirmScore = useCallback(() => {
    const value = parseInt(currentScoreInput);
    if (value === 0 || !scoreModal.playerId) {
      closeScoreModal();
      return;
    }

    setPlayers(prev => {
      const newPlayers = prev.map(p => {
        if (p.id !== scoreModal.playerId) return p;

        const newScore = scoreModal.mode === 'add'
          ? p.score + value
          : Math.max(0, p.score - value);

        return {
          ...p,
          score: newScore,
          history: [...p.history, {
            value: scoreModal.mode === 'add' ? value : -value,
            type: scoreModal.mode,
          }],
        };
      });

      // Check for winner
      const winner = newPlayers.find(p => p.id === scoreModal.playerId && p.score >= TARGET_SCORE);
      if (winner) {
        celebrateWinner();
      } else {
        nextTurn();
      }

      return newPlayers;
    });

    closeScoreModal();
  }, [currentScoreInput, scoreModal, closeScoreModal, celebrateWinner, nextTurn]);

  const farkle = useCallback((playerId: string) => {
    setPlayers(prev => prev.map(p =>
      p.id === playerId
        ? { ...p, history: [...p.history, { value: 0, type: 'farkle' as const }] }
        : p
    ));
    nextTurn();
  }, [nextTurn]);

  const toggleHistory = useCallback((playerId: string) => {
    setExpandedHistory(prev => {
      const next = new Set(prev);
      if (next.has(playerId)) {
        next.delete(playerId);
      } else {
        next.add(playerId);
      }
      return next;
    });
  }, []);

  const getSortedPlayers = useCallback(() => {
    return [...players].sort((a, b) => b.score - a.score);
  }, [players]);

  const getPlayerRank = useCallback((playerId: string) => {
    const sorted = getSortedPlayers();
    return sorted.findIndex(p => p.id === playerId) + 1;
  }, [getSortedPlayers]);

  const confirmNewGame = useCallback(() => {
    if (players.length === 0) {
      return;
    }
    setConfirmModalOpen(true);
  }, [players.length]);

  const startNewGame = useCallback(() => {
    setPlayers(prev => prev.map(p => ({
      ...p,
      score: 0,
      history: [],
    })));
    setCurrentPlayerIndex(0);
    setConfirmModalOpen(false);
  }, []);

  const winner = players.find(p => p.score >= TARGET_SCORE);
  const currentPlayer = scoreModal.playerId ? players.find(p => p.id === scoreModal.playerId) : null;

  return (
    <div className="game-container">
      <header className="game-header">
        <h1>
          <DiceIcon />
          TIENDUIZEND
        </h1>
        <div className="target-score">Eerste tot 10.000 wint!</div>
      </header>

      <main className="game-main">
        <div className="players-list">
          {players.map((player, index) => {
            const rank = getPlayerRank(player.id);
            const isActive = index === currentPlayerIndex && !winner;
            const isWinner = player.score >= TARGET_SCORE;
            const progress = Math.min(100, (player.score / TARGET_SCORE) * 100);

            return (
              <div
                key={player.id}
                className={`player-card ${isActive ? 'active' : ''} ${isWinner ? 'winner' : ''}`}
              >
                {isWinner && <div className="winner-badge">WINNAAR!</div>}
                <div className="player-header">
                  <div className="player-name">
                    <span className={`player-rank rank-${rank <= 3 ? rank : 'other'}`}>
                      {rank}
                    </span>
                    <input
                      type="text"
                      value={player.name}
                      onChange={(e) => updatePlayerName(player.id, e.target.value)}
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                    />
                    {isActive && <span className="turn-indicator">aan de beurt</span>}
                  </div>
                </div>
                <div className="player-score">
                  {player.score.toLocaleString('nl-NL')}
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${progress}%` }} />
                </div>
                <div className="player-actions">
                  <button
                    className="btn btn-add"
                    onClick={() => openScoreModal(player.id, 'add')}
                  >
                    + Score
                  </button>
                  <button
                    className="btn btn-subtract"
                    onClick={() => openScoreModal(player.id, 'subtract')}
                  >
                    - Score
                  </button>
                  <button
                    className="btn btn-farkle"
                    onClick={() => farkle(player.id)}
                  >
                    <span role="img" aria-label="farkle">💥</span>
                  </button>
                  <button
                    className="btn btn-delete"
                    onClick={() => deletePlayer(player.id)}
                  >
                    <span role="img" aria-label="delete">🗑</span>
                  </button>
                </div>
                <div
                  className="history-toggle"
                  onClick={() => toggleHistory(player.id)}
                >
                  {player.history.length} beurten — tik voor geschiedenis
                </div>
                {expandedHistory.has(player.id) && (
                  <div className="score-history">
                    {player.history.slice(-20).map((h, i) => (
                      <span key={i} className={`history-item ${h.type}`}>
                        {h.type === 'farkle' ? '💥' : (h.value >= 0 ? '+' : '') + h.value}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {players.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">🎲</div>
            <p>Voeg spelers toe om te beginnen!</p>
          </div>
        )}
      </main>

      <div className="bottom-bar">
        <button className="btn btn-large btn-add-player" onClick={addPlayer}>
          <span role="img" aria-label="add">➕</span> Speler
        </button>
        <button className="btn btn-large btn-new-game" onClick={confirmNewGame}>
          <span role="img" aria-label="new">🔄</span> Nieuw Spel
        </button>
        <button className="btn btn-large btn-rules" onClick={() => setRulesModalOpen(true)}>
          <span role="img" aria-label="rules">📖</span> Spelregels & Puntentelling
        </button>
      </div>

      <footer className="game-footer">
        <p>All processing happens in your browser. No data is sent to any server.</p>
        <p>Made by <a href="https://robinvanbaalen.nl" target="_blank" rel="noopener">Robin</a>.</p>
      </footer>

      {/* Score Input Modal */}
      {scoreModal.isOpen && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && closeScoreModal()}>
          <div className="modal">
            <h2>
              {currentPlayer?.name}: {scoreModal.mode === 'add' ? '+' : '-'}Score
            </h2>
            <div className="quick-scores">
              {QUICK_SCORES.map(score => (
                <button key={score} className="quick-btn" onClick={() => setQuickScore(score)}>
                  {score}
                </button>
              ))}
            </div>
            <div className="score-input-display">
              {parseInt(currentScoreInput).toLocaleString('nl-NL')}
            </div>
            <div className="numpad">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(digit => (
                <button key={digit} className="numpad-btn" onClick={() => appendDigit(digit)}>
                  {digit}
                </button>
              ))}
              <button className="numpad-btn clear" onClick={clearScore}>C</button>
              <button className="numpad-btn" onClick={() => appendDigit('0')}>0</button>
              <button className="numpad-btn backspace" onClick={backspace}>⌫</button>
              <button className="numpad-btn confirm" onClick={confirmScore}>
                ✓ Bevestig
              </button>
            </div>
            <button className="modal-close" onClick={closeScoreModal}>
              Annuleren
            </button>
          </div>
        </div>
      )}

      {/* Rules Modal */}
      {rulesModalOpen && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setRulesModalOpen(false)}>
          <div className="modal">
            <h2>🎲 Spelregels</h2>
            <div className="rules-content">
              <h3>Doel</h3>
              <p>Eerste speler die 10.000 punten bereikt wint!</p>

              <h3>Spelverloop</h3>
              <ul>
                <li>Gooi met 6 dobbelstenen</li>
                <li>Leg scorende dobbelstenen apart</li>
                <li>Kies: stoppen en punten noteren, of doorgooien met resterende dobbelstenen</li>
                <li>Als alle 6 dobbelstenen gescoord hebben, mag je opnieuw met 6 gooien!</li>
              </ul>

              <h3>FARKLE! 💥</h3>
              <p>Geen scorende dobbelsteen? Je verliest alle punten van deze beurt!</p>

              <h3>Puntentelling</h3>
              <table className="scoring-table">
                <tbody>
                  <tr><td>Enkele 1</td><td>100</td></tr>
                  <tr><td>Enkele 5</td><td>50</td></tr>
                  <tr><td>Drie gelijke (behalve 1)</td><td>waarde × 100</td></tr>
                  <tr><td>Drie 1-en</td><td>1000</td></tr>
                  <tr><td>Vier gelijke</td><td>× 2</td></tr>
                  <tr><td>Vijf gelijke</td><td>× 4</td></tr>
                  <tr><td>Zes gelijke</td><td>× 8</td></tr>
                  <tr><td>Straat (1-2-3-4-5-6)</td><td>1500</td></tr>
                  <tr><td>Drie paren</td><td>1500</td></tr>
                </tbody>
              </table>

              <h3>Opstarten</h3>
              <p>Je moet minimaal 350 punten in één beurt halen om "op het bord" te komen.</p>
            </div>
            <button className="modal-close" onClick={() => setRulesModalOpen(false)}>
              Sluiten
            </button>
          </div>
        </div>
      )}

      {/* Confirm New Game Modal */}
      {confirmModalOpen && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setConfirmModalOpen(false)}>
          <div className="modal">
            <h2>Nieuw Spel?</h2>
            <p className="confirm-text">
              Alle scores worden gereset. Weet je het zeker?
            </p>
            <button className="numpad-btn confirm" onClick={startNewGame}>
              ✓ Ja, nieuw spel
            </button>
            <button className="modal-close" onClick={() => setConfirmModalOpen(false)}>
              Annuleren
            </button>
          </div>
        </div>
      )}

      {/* Confetti */}
      {confettiActive && <Confetti />}
    </div>
  );
}

function DiceIcon() {
  return (
    <div className="dice-icon">
      <span className="dot dot-1" />
      <span className="dot dot-2" />
      <span className="dot dot-3" />
      <span className="dot dot-4" />
      <span className="dot dot-5" />
      <span className="dot dot-6" />
      <span className="dot dot-7" />
      <span className="dot dot-8" />
      <span className="dot dot-9" />
    </div>
  );
}

function Confetti() {
  useEffect(() => {
    const canvas = document.getElementById('confetti-canvas') as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: {
      x: number;
      y: number;
      vx: number;
      vy: number;
      color: string;
      size: number;
      rotation: number;
      rotationSpeed: number;
    }[] = [];

    const colors = ['#e94560', '#f9ed69', '#08d9d6', '#b537f2', '#ffd700'];

    for (let i = 0; i < 150; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        vx: (Math.random() - 0.5) * 4,
        vy: Math.random() * 3 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 4,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
      });
    }

    let frame = 0;
    let animationId: number;

    function animate() {
      ctx!.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach(p => {
        ctx!.save();
        ctx!.translate(p.x, p.y);
        ctx!.rotate(p.rotation * Math.PI / 180);
        ctx!.fillStyle = p.color;
        ctx!.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx!.restore();

        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1;
        p.rotation += p.rotationSpeed;
      });

      frame++;
      if (frame < 180) {
        animationId = requestAnimationFrame(animate);
      } else {
        ctx!.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    animate();

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, []);

  return <canvas id="confetti-canvas" className="confetti" />;
}
