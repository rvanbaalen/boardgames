import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface HistoryEntry {
  id: string;
  value: number;
  type: 'add' | 'farkle';
}

interface Player {
  id: string;
  name: string;
  score: number;
  history: HistoryEntry[];
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
  }>({ isOpen: false, playerId: null });
  const [currentScoreInput, setCurrentScoreInput] = useState('0');
  const [rulesModalOpen, setRulesModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [deleteConfirmPlayer, setDeleteConfirmPlayer] = useState<string | null>(null);
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

  const confirmDeletePlayer = useCallback((id: string) => {
    setDeleteConfirmPlayer(id);
  }, []);

  const deletePlayer = useCallback(() => {
    if (!deleteConfirmPlayer) return;
    setPlayers(prev => {
      const newPlayers = prev.filter(p => p.id !== deleteConfirmPlayer);
      if (currentPlayerIndex >= newPlayers.length && newPlayers.length > 0) {
        setCurrentPlayerIndex(0);
      }
      return newPlayers;
    });
    setDeleteConfirmPlayer(null);
  }, [currentPlayerIndex, deleteConfirmPlayer]);

  const deleteScore = useCallback((playerId: string, historyId: string) => {
    setPlayers(prev => prev.map(p => {
      if (p.id !== playerId) return p;

      const historyItem = p.history.find(h => h.id === historyId);
      if (!historyItem) return p;

      const scoreChange = historyItem.type === 'add' ? -historyItem.value : 0;

      return {
        ...p,
        score: p.score + scoreChange,
        history: p.history.filter(h => h.id !== historyId),
      };
    }));
  }, []);

  const updatePlayerName = useCallback((id: string, name: string) => {
    setPlayers(prev => prev.map(p =>
      p.id === id ? { ...p, name: name || 'Speler' } : p
    ));
  }, []);

  const openScoreModal = useCallback((playerId: string) => {
    setScoreModal({ isOpen: true, playerId });
    setCurrentScoreInput('0');
  }, []);

  const closeScoreModal = useCallback(() => {
    setScoreModal({ isOpen: false, playerId: null });
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

        return {
          ...p,
          score: p.score + value,
          history: [...p.history, {
            id: generateId(),
            value: value,
            type: 'add' as const,
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
        ? { ...p, history: [...p.history, { id: generateId(), value: 0, type: 'farkle' as const }] }
        : p
    ));
    nextTurn();
  }, [nextTurn]);

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
          TIENDUIZENDEN
        </h1>
        <div className="target-score">Eerste tot 10.000 wint!</div>
      </header>

      <main className="game-main">
        <div className="players-list">
          <AnimatePresence mode="popLayout">
            {players.map((player, index) => {
              const rank = getPlayerRank(player.id);
              const isActive = index === currentPlayerIndex && !winner;
              const isWinner = player.score >= TARGET_SCORE;
              const progress = Math.min(100, (player.score / TARGET_SCORE) * 100);

              return (
                <motion.div
                  key={player.id}
                  layout
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: -20 }}
                  transition={{
                    type: 'spring',
                    stiffness: 500,
                    damping: 30,
                    opacity: { duration: 0.2 }
                  }}
                  className={`player-card ${isActive ? 'active' : ''} ${isWinner ? 'winner' : ''}`}
                >
                  <motion.button
                    className="btn-delete-small"
                    onClick={() => confirmDeletePlayer(player.id)}
                    aria-label="Verwijder speler"
                    whileHover={{ scale: 1.1, opacity: 1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    ×
                  </motion.button>
                  {isWinner && (
                    <motion.div
                      className="winner-badge"
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 15 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                    >
                      WINNAAR!
                    </motion.div>
                  )}
                  <div className="player-header">
                    <motion.span
                      className={`player-rank rank-${rank <= 3 ? rank : 'other'}`}
                      key={rank}
                      initial={{ scale: 1.3 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                    >
                      {rank}
                    </motion.span>
                    <input
                      type="text"
                      value={player.name}
                      onChange={(e) => updatePlayerName(player.id, e.target.value)}
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                      className="player-name-input"
                    />
                  </div>
                  <motion.div
                    className="player-score"
                    key={player.score}
                    initial={{ scale: 1.2, color: '#08d9d6' }}
                    animate={{ scale: 1, color: isWinner ? '#ffd700' : '#f9ed69' }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  >
                    {player.score.toLocaleString('nl-NL')}
                  </motion.div>
                  <div className="progress-bar">
                    <motion.div
                      className="progress-fill"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ type: 'spring', stiffness: 100, damping: 20 }}
                    />
                  </div>
                  <div className="score-history">
                    {player.history.length === 0 ? (
                      <span className="history-empty">Nog geen scores</span>
                    ) : (
                      <AnimatePresence initial={false}>
                        {player.history.slice().reverse().map((h) => (
                          <motion.button
                            key={h.id}
                            layout
                            className={`history-item ${h.type}`}
                            initial={{ opacity: 0, x: -30 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 50 }}
                            transition={{
                              type: 'spring',
                              stiffness: 500,
                              damping: 30,
                              layout: { type: 'spring', stiffness: 400, damping: 30 }
                            }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => deleteScore(player.id, h.id)}
                          >
                            {h.type === 'farkle' ? '💥 Kaput' : '+' + h.value.toLocaleString('nl-NL')}
                          </motion.button>
                        ))}
                      </AnimatePresence>
                    )}
                  </div>
                  <div className="player-actions">
                    <motion.button
                      className="btn btn-add"
                      onClick={() => openScoreModal(player.id)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      + Score
                    </motion.button>
                    <motion.button
                      className="btn btn-farkle"
                      onClick={() => farkle(player.id)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      💥 Kaput
                    </motion.button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {players.length === 0 && (
            <motion.div
              className="empty-state"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <motion.div
                className="empty-state-icon"
                animate={{ rotate: [0, -10, 10, -10, 0] }}
                transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
              >
                🎲
              </motion.div>
              <p>Voeg spelers toe om te beginnen!</p>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <div className="bottom-bar">
        <motion.button
          className="btn btn-large btn-add-player"
          onClick={addPlayer}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.95 }}
        >
          <span role="img" aria-label="add">➕</span> Speler
        </motion.button>
        <motion.button
          className="btn btn-large btn-new-game"
          onClick={confirmNewGame}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.95 }}
        >
          <span role="img" aria-label="new">🔄</span> Nieuw Spel
        </motion.button>
        <motion.button
          className="btn btn-large btn-rules"
          onClick={() => setRulesModalOpen(true)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.95 }}
        >
          <span role="img" aria-label="rules">📖</span> Spelregels & Puntentelling
        </motion.button>
      </div>

      <footer className="game-footer">
        <p><a href="/tienduizenden/spelregels">Volledige spelregels & puntentelling</a></p>
        <p>All processing happens in your browser. No data is sent to any server.</p>
        <p>Made by <a href="https://robinvanbaalen.nl?utm_source=boardgames&utm_medium=footer&utm_campaign=tienduizenden" target="_blank">Robin</a>.</p>
      </footer>

      {/* Score Input Modal */}
      <AnimatePresence>
        {scoreModal.isOpen && (
          <motion.div
            className="modal-overlay"
            onClick={(e) => e.target === e.currentTarget && closeScoreModal()}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="modal"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              <h2>
                {currentPlayer?.name}: +Score
              </h2>
              <div className="quick-scores">
                {QUICK_SCORES.map(score => (
                  <motion.button
                    key={score}
                    className="quick-btn"
                    onClick={() => setQuickScore(score)}
                    whileTap={{ scale: 0.9 }}
                  >
                    {score}
                  </motion.button>
                ))}
              </div>
              <motion.div
                className="score-input-display"
                key={currentScoreInput}
                initial={{ scale: 1.1 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 20 }}
              >
                {parseInt(currentScoreInput).toLocaleString('nl-NL')}
              </motion.div>
              <div className="numpad">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(digit => (
                  <motion.button
                    key={digit}
                    className="numpad-btn"
                    onClick={() => appendDigit(digit)}
                    whileTap={{ scale: 0.9 }}
                  >
                    {digit}
                  </motion.button>
                ))}
                <motion.button className="numpad-btn clear" onClick={clearScore} whileTap={{ scale: 0.9 }}>C</motion.button>
                <motion.button className="numpad-btn" onClick={() => appendDigit('0')} whileTap={{ scale: 0.9 }}>0</motion.button>
                <motion.button className="numpad-btn backspace" onClick={backspace} whileTap={{ scale: 0.9 }}>⌫</motion.button>
                <motion.button
                  className="numpad-btn confirm"
                  onClick={confirmScore}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.95 }}
                >
                  ✓ Bevestig
                </motion.button>
              </div>
              <motion.button
                className="modal-close"
                onClick={closeScoreModal}
                whileTap={{ scale: 0.95 }}
              >
                Annuleren
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rules Modal */}
      <AnimatePresence>
        {rulesModalOpen && (
          <motion.div
            className="modal-overlay"
            onClick={(e) => e.target === e.currentTarget && setRulesModalOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="modal"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
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
                <p>Je moet minimaal 600 punten in één beurt halen om "op het bord" te komen.</p>
              </div>
              <motion.button
                className="modal-close"
                onClick={() => setRulesModalOpen(false)}
                whileTap={{ scale: 0.95 }}
              >
                Sluiten
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm New Game Modal */}
      <AnimatePresence>
        {confirmModalOpen && (
          <motion.div
            className="modal-overlay"
            onClick={(e) => e.target === e.currentTarget && setConfirmModalOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="modal"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              <h2>Nieuw Spel?</h2>
              <p className="confirm-text">
                Alle scores worden gereset. Weet je het zeker?
              </p>
              <motion.button
                className="numpad-btn confirm"
                onClick={startNewGame}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.95 }}
              >
                ✓ Ja, nieuw spel
              </motion.button>
              <motion.button
                className="modal-close"
                onClick={() => setConfirmModalOpen(false)}
                whileTap={{ scale: 0.95 }}
              >
                Annuleren
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm Delete Player Modal */}
      <AnimatePresence>
        {deleteConfirmPlayer && (
          <motion.div
            className="modal-overlay"
            onClick={(e) => e.target === e.currentTarget && setDeleteConfirmPlayer(null)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="modal modal-small"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              <h2>Speler verwijderen?</h2>
              <p className="confirm-text">
                {players.find(p => p.id === deleteConfirmPlayer)?.name} wordt verwijderd.
              </p>
              <div className="modal-actions">
                <motion.button
                  className="btn-cancel-action"
                  onClick={() => setDeleteConfirmPlayer(null)}
                  whileTap={{ scale: 0.95 }}
                >
                  Annuleren
                </motion.button>
                <motion.button
                  className="btn-confirm-action"
                  onClick={deletePlayer}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Verwijder
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
