import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface RoundScore {
  id: string;
  round: number;
  value: number;
  isWinner: boolean; // Wie uitgaat krijgt 0 punten
}

interface Player {
  id: string;
  name: string;
  scores: RoundScore[];
  color: string;
}

interface GameSettings {
  endCondition: 'rounds' | 'points' | 'none';
  maxRounds: number;
  maxPoints: number;
}

interface GameState {
  players: Player[];
  currentRound: number;
  settings: GameSettings;
  gameEnded: boolean;
}

const PLAYER_COLORS = ['#e94560', '#08d9d6', '#f9ed69', '#b537f2', '#06d6a0', '#ff6b6b'];
const QUICK_SCORES = [5, 10, 15, 20, 25, 30, 40, 50, 100];

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export default function AmerikaansJokerenGame() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentRound, setCurrentRound] = useState(1);
  const [settings, setSettings] = useState<GameSettings>({
    endCondition: 'none',
    maxRounds: 10,
    maxPoints: 500,
  });
  const [gameEnded, setGameEnded] = useState(false);

  const [roundScoreModal, setRoundScoreModal] = useState<{
    isOpen: boolean;
    roundScores: { [playerId: string]: string };
    winnerId: string | null;
  }>({ isOpen: false, roundScores: {}, winnerId: null });

  const [rulesModalOpen, setRulesModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [deleteConfirmPlayer, setDeleteConfirmPlayer] = useState<string | null>(null);
  const [confettiActive, setConfettiActive] = useState(false);
  const [activeScoreInput, setActiveScoreInput] = useState<string | null>(null);

  // Load game from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('amerikaans-jokeren');
    if (saved) {
      try {
        const data: GameState = JSON.parse(saved);
        setPlayers(data.players || []);
        setCurrentRound(data.currentRound || 1);
        setSettings(data.settings || { endCondition: 'none', maxRounds: 10, maxPoints: 500 });
        setGameEnded(data.gameEnded || false);
      } catch (e) {
        console.error('Failed to load game state:', e);
      }
    }
  }, []);

  // Save game to localStorage
  useEffect(() => {
    localStorage.setItem('amerikaans-jokeren', JSON.stringify({
      players,
      currentRound,
      settings,
      gameEnded,
    }));
  }, [players, currentRound, settings, gameEnded]);

  const getTotalScore = useCallback((player: Player) => {
    return player.scores.reduce((sum, s) => sum + s.value, 0);
  }, []);

  const getSortedPlayers = useCallback(() => {
    return [...players].sort((a, b) => getTotalScore(a) - getTotalScore(b));
  }, [players, getTotalScore]);

  const getPlayerRank = useCallback((playerId: string) => {
    const sorted = getSortedPlayers();
    return sorted.findIndex(p => p.id === playerId) + 1;
  }, [getSortedPlayers]);

  const addPlayer = useCallback(() => {
    const playerNum = players.length + 1;
    setPlayers(prev => [...prev, {
      id: generateId(),
      name: `Speler ${playerNum}`,
      scores: [],
      color: PLAYER_COLORS[(playerNum - 1) % PLAYER_COLORS.length],
    }]);
  }, [players.length]);

  const confirmDeletePlayer = useCallback((id: string) => {
    setDeleteConfirmPlayer(id);
  }, []);

  const deletePlayer = useCallback(() => {
    if (!deleteConfirmPlayer) return;
    setPlayers(prev => prev.filter(p => p.id !== deleteConfirmPlayer));
    setDeleteConfirmPlayer(null);
  }, [deleteConfirmPlayer]);

  const updatePlayerName = useCallback((id: string, name: string) => {
    setPlayers(prev => prev.map(p =>
      p.id === id ? { ...p, name: name || 'Speler' } : p
    ));
  }, []);

  const deleteRoundScore = useCallback((playerId: string, scoreId: string) => {
    setPlayers(prev => prev.map(p => {
      if (p.id !== playerId) return p;
      return {
        ...p,
        scores: p.scores.filter(s => s.id !== scoreId),
      };
    }));
  }, []);

  const openRoundScoreModal = useCallback(() => {
    const initialScores: { [playerId: string]: string } = {};
    players.forEach(p => {
      initialScores[p.id] = '';
    });
    setRoundScoreModal({
      isOpen: true,
      roundScores: initialScores,
      winnerId: null,
    });
    setActiveScoreInput(players[0]?.id || null);
  }, [players]);

  const closeRoundScoreModal = useCallback(() => {
    setRoundScoreModal({ isOpen: false, roundScores: {}, winnerId: null });
    setActiveScoreInput(null);
  }, []);

  const setRoundWinner = useCallback((playerId: string) => {
    setRoundScoreModal(prev => ({
      ...prev,
      winnerId: prev.winnerId === playerId ? null : playerId,
      roundScores: {
        ...prev.roundScores,
        [playerId]: prev.winnerId === playerId ? prev.roundScores[playerId] : '0',
      },
    }));
  }, []);

  const updateRoundScore = useCallback((playerId: string, value: string) => {
    if (roundScoreModal.winnerId === playerId) return; // Winner always has 0
    setRoundScoreModal(prev => ({
      ...prev,
      roundScores: {
        ...prev.roundScores,
        [playerId]: value,
      },
    }));
  }, [roundScoreModal.winnerId]);

  const appendDigit = useCallback((digit: string) => {
    if (!activeScoreInput || roundScoreModal.winnerId === activeScoreInput) return;
    setRoundScoreModal(prev => {
      const current = prev.roundScores[activeScoreInput] || '';
      const newValue = current === '0' || current === '' ? digit : current + digit;
      if (newValue.length > 4) return prev;
      return {
        ...prev,
        roundScores: {
          ...prev.roundScores,
          [activeScoreInput]: newValue,
        },
      };
    });
  }, [activeScoreInput, roundScoreModal.winnerId]);

  const clearActiveScore = useCallback(() => {
    if (!activeScoreInput || roundScoreModal.winnerId === activeScoreInput) return;
    setRoundScoreModal(prev => ({
      ...prev,
      roundScores: {
        ...prev.roundScores,
        [activeScoreInput]: '',
      },
    }));
  }, [activeScoreInput, roundScoreModal.winnerId]);

  const backspace = useCallback(() => {
    if (!activeScoreInput || roundScoreModal.winnerId === activeScoreInput) return;
    setRoundScoreModal(prev => {
      const current = prev.roundScores[activeScoreInput] || '';
      return {
        ...prev,
        roundScores: {
          ...prev.roundScores,
          [activeScoreInput]: current.slice(0, -1),
        },
      };
    });
  }, [activeScoreInput, roundScoreModal.winnerId]);

  const setQuickScore = useCallback((value: number) => {
    if (!activeScoreInput || roundScoreModal.winnerId === activeScoreInput) return;
    setRoundScoreModal(prev => ({
      ...prev,
      roundScores: {
        ...prev.roundScores,
        [activeScoreInput]: value.toString(),
      },
    }));
  }, [activeScoreInput, roundScoreModal.winnerId]);

  const celebrateWinner = useCallback(() => {
    setConfettiActive(true);
    setTimeout(() => setConfettiActive(false), 3000);
  }, []);

  const checkGameEnd = useCallback((updatedPlayers: Player[], newRound: number): boolean => {
    if (settings.endCondition === 'rounds' && newRound > settings.maxRounds) {
      return true;
    }
    if (settings.endCondition === 'points') {
      const hasReachedLimit = updatedPlayers.some(p =>
        p.scores.reduce((sum, s) => sum + s.value, 0) >= settings.maxPoints
      );
      if (hasReachedLimit) {
        return true;
      }
    }
    return false;
  }, [settings]);

  const confirmRoundScores = useCallback(() => {
    // Validate all scores are filled
    const allFilled = players.every(p => {
      if (roundScoreModal.winnerId === p.id) return true;
      const score = roundScoreModal.roundScores[p.id];
      return score !== '' && score !== undefined;
    });

    if (!allFilled) {
      return; // Don't submit if not all scores are filled
    }

    setPlayers(prev => {
      const newPlayers = prev.map(p => {
        const isWinner = roundScoreModal.winnerId === p.id;
        const scoreValue = isWinner ? 0 : parseInt(roundScoreModal.roundScores[p.id] || '0');

        return {
          ...p,
          scores: [...p.scores, {
            id: generateId(),
            round: currentRound,
            value: scoreValue,
            isWinner,
          }],
        };
      });

      const newRound = currentRound + 1;
      const shouldEnd = checkGameEnd(newPlayers, newRound);

      if (shouldEnd) {
        setGameEnded(true);
        celebrateWinner();
      }

      return newPlayers;
    });

    setCurrentRound(prev => prev + 1);
    closeRoundScoreModal();
  }, [players, roundScoreModal, currentRound, closeRoundScoreModal, checkGameEnd, celebrateWinner]);

  const confirmNewGame = useCallback(() => {
    if (players.length === 0) {
      return;
    }
    setConfirmModalOpen(true);
  }, [players.length]);

  const startNewGame = useCallback(() => {
    setPlayers(prev => prev.map(p => ({
      ...p,
      scores: [],
    })));
    setCurrentRound(1);
    setGameEnded(false);
    setConfirmModalOpen(false);
  }, []);

  const getWinner = useCallback(() => {
    if (!gameEnded || players.length === 0) return null;
    const sorted = getSortedPlayers();
    return sorted[0];
  }, [gameEnded, players.length, getSortedPlayers]);

  const winner = getWinner();

  return (
    <div className="game-container">
      <header className="game-header">
        <h1>
          <CardIcon />
          AMERIKAANS JOKEREN
        </h1>
        <div className="target-score">
          {settings.endCondition === 'rounds' && `${currentRound}/${settings.maxRounds} rondes`}
          {settings.endCondition === 'points' && `Tot ${settings.maxPoints} strafpunten`}
          {settings.endCondition === 'none' && `Ronde ${currentRound}`}
          {' '} - Laagste score wint!
        </div>
      </header>

      <main className="game-main">
        <div className="players-list">
          <AnimatePresence mode="popLayout">
            {players.map((player) => {
              const rank = getPlayerRank(player.id);
              const totalScore = getTotalScore(player);
              const isWinner = gameEnded && winner?.id === player.id;
              const isLoser = gameEnded && settings.endCondition === 'points' && totalScore >= settings.maxPoints;

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
                  className={`player-card ${isWinner ? 'winner' : ''} ${isLoser ? 'loser' : ''}`}
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
                    key={totalScore}
                    initial={{ scale: 1.2, color: '#e94560' }}
                    animate={{ scale: 1, color: isWinner ? '#ffd700' : '#f9ed69' }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  >
                    {totalScore.toLocaleString('nl-NL')}
                  </motion.div>
                  {settings.endCondition === 'points' && (
                    <div className="progress-bar">
                      <motion.div
                        className="progress-fill danger"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (totalScore / settings.maxPoints) * 100)}%` }}
                        transition={{ type: 'spring', stiffness: 100, damping: 20 }}
                      />
                    </div>
                  )}
                  <div className="score-history">
                    {player.scores.length === 0 ? (
                      <span className="history-empty">Nog geen scores</span>
                    ) : (
                      <AnimatePresence initial={false}>
                        {player.scores.slice().reverse().map((s) => (
                          <motion.button
                            key={s.id}
                            layout
                            className={`history-item ${s.isWinner ? 'winner-round' : 'penalty'}`}
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
                            onClick={() => deleteRoundScore(player.id, s.id)}
                          >
                            <span className="round-num">R{s.round}</span>
                            {s.isWinner ? '0' : '+' + s.value.toLocaleString('nl-NL')}
                          </motion.button>
                        ))}
                      </AnimatePresence>
                    )}
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
                🃏
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
        {players.length >= 2 && !gameEnded && (
          <motion.button
            className="btn btn-large btn-add-round"
            onClick={openRoundScoreModal}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
          >
            <span role="img" aria-label="round">📝</span> Ronde {currentRound}
          </motion.button>
        )}
        <motion.button
          className="btn btn-large btn-new-game"
          onClick={confirmNewGame}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.95 }}
        >
          <span role="img" aria-label="new">🔄</span> Nieuw Spel
        </motion.button>
        <motion.button
          className="btn btn-large btn-settings"
          onClick={() => setSettingsModalOpen(true)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.95 }}
        >
          <span role="img" aria-label="settings">⚙️</span> Instellingen
        </motion.button>
        <motion.button
          className="btn btn-large btn-rules"
          onClick={() => setRulesModalOpen(true)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.95 }}
        >
          <span role="img" aria-label="rules">📖</span> Spelregels
        </motion.button>
      </div>

      <footer className="game-footer">
        <p>All processing happens in your browser. No data is sent to any server.</p>
        <p>Made by <a href="https://robinvanbaalen.nl?utm_source=boardgames&utm_medium=footer&utm_campaign=amerikaans-jokeren" target="_blank">Robin</a>.</p>
      </footer>

      {/* Round Score Modal */}
      <AnimatePresence>
        {roundScoreModal.isOpen && (
          <motion.div
            className="modal-overlay"
            onClick={(e) => e.target === e.currentTarget && closeRoundScoreModal()}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="modal modal-round"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              <h2>Ronde {currentRound} - Scores</h2>
              <p className="modal-hint">Klik op een speler om strafpunten in te voeren. Markeer wie uitgaat (0 punten).</p>

              <div className="round-players">
                {players.map(player => {
                  const isWinner = roundScoreModal.winnerId === player.id;
                  const isActive = activeScoreInput === player.id;
                  const score = roundScoreModal.roundScores[player.id] || '';

                  return (
                    <motion.div
                      key={player.id}
                      className={`round-player-row ${isActive ? 'active' : ''} ${isWinner ? 'winner' : ''}`}
                      onClick={() => setActiveScoreInput(player.id)}
                      whileTap={{ scale: 0.98 }}
                    >
                      <span className="round-player-name">{player.name}</span>
                      <div className="round-player-score">
                        {isWinner ? (
                          <span className="winner-zero">0</span>
                        ) : (
                          <span className={score ? '' : 'placeholder'}>{score || '...'}</span>
                        )}
                      </div>
                      <motion.button
                        className={`btn-winner ${isWinner ? 'selected' : ''}`}
                        onClick={(e) => { e.stopPropagation(); setRoundWinner(player.id); }}
                        whileTap={{ scale: 0.9 }}
                      >
                        {isWinner ? '🏆' : '👑'}
                      </motion.button>
                    </motion.div>
                  );
                })}
              </div>

              <div className="quick-scores">
                {QUICK_SCORES.map(score => (
                  <motion.button
                    key={score}
                    className="quick-btn"
                    onClick={() => setQuickScore(score)}
                    whileTap={{ scale: 0.9 }}
                    disabled={!activeScoreInput || roundScoreModal.winnerId === activeScoreInput}
                  >
                    {score}
                  </motion.button>
                ))}
              </div>

              <div className="numpad">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(digit => (
                  <motion.button
                    key={digit}
                    className="numpad-btn"
                    onClick={() => appendDigit(digit)}
                    whileTap={{ scale: 0.9 }}
                    disabled={!activeScoreInput || roundScoreModal.winnerId === activeScoreInput}
                  >
                    {digit}
                  </motion.button>
                ))}
                <motion.button
                  className="numpad-btn clear"
                  onClick={clearActiveScore}
                  whileTap={{ scale: 0.9 }}
                  disabled={!activeScoreInput || roundScoreModal.winnerId === activeScoreInput}
                >
                  C
                </motion.button>
                <motion.button
                  className="numpad-btn"
                  onClick={() => appendDigit('0')}
                  whileTap={{ scale: 0.9 }}
                  disabled={!activeScoreInput || roundScoreModal.winnerId === activeScoreInput}
                >
                  0
                </motion.button>
                <motion.button
                  className="numpad-btn backspace"
                  onClick={backspace}
                  whileTap={{ scale: 0.9 }}
                  disabled={!activeScoreInput || roundScoreModal.winnerId === activeScoreInput}
                >
                  ⌫
                </motion.button>
                <motion.button
                  className="numpad-btn confirm"
                  onClick={confirmRoundScores}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.95 }}
                >
                  ✓ Bevestig Ronde
                </motion.button>
              </div>
              <motion.button
                className="modal-close"
                onClick={closeRoundScoreModal}
                whileTap={{ scale: 0.95 }}
              >
                Annuleren
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {settingsModalOpen && (
          <motion.div
            className="modal-overlay"
            onClick={(e) => e.target === e.currentTarget && setSettingsModalOpen(false)}
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
              <h2>⚙️ Spelinstellingen</h2>

              <div className="settings-section">
                <h3>Wanneer eindigt het spel?</h3>

                <div className="settings-options">
                  <label className={`settings-option ${settings.endCondition === 'none' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="endCondition"
                      checked={settings.endCondition === 'none'}
                      onChange={() => setSettings(prev => ({ ...prev, endCondition: 'none' }))}
                    />
                    <span className="option-title">Geen limiet</span>
                    <span className="option-desc">Handmatig stoppen</span>
                  </label>

                  <label className={`settings-option ${settings.endCondition === 'rounds' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="endCondition"
                      checked={settings.endCondition === 'rounds'}
                      onChange={() => setSettings(prev => ({ ...prev, endCondition: 'rounds' }))}
                    />
                    <span className="option-title">Vast aantal rondes</span>
                    <span className="option-desc">Na X rondes</span>
                  </label>

                  <label className={`settings-option ${settings.endCondition === 'points' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="endCondition"
                      checked={settings.endCondition === 'points'}
                      onChange={() => setSettings(prev => ({ ...prev, endCondition: 'points' }))}
                    />
                    <span className="option-title">Puntenlimiet</span>
                    <span className="option-desc">Eerste die X bereikt verliest</span>
                  </label>
                </div>

                {settings.endCondition === 'rounds' && (
                  <div className="settings-input-group">
                    <label>Aantal rondes:</label>
                    <input
                      type="number"
                      min="1"
                      max="99"
                      value={settings.maxRounds}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        maxRounds: Math.max(1, Math.min(99, parseInt(e.target.value) || 10))
                      }))}
                    />
                  </div>
                )}

                {settings.endCondition === 'points' && (
                  <div className="settings-input-group">
                    <label>Maximum strafpunten:</label>
                    <input
                      type="number"
                      min="100"
                      max="9999"
                      step="50"
                      value={settings.maxPoints}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        maxPoints: Math.max(100, Math.min(9999, parseInt(e.target.value) || 500))
                      }))}
                    />
                  </div>
                )}
              </div>

              <motion.button
                className="modal-close"
                onClick={() => setSettingsModalOpen(false)}
                whileTap={{ scale: 0.95 }}
              >
                Sluiten
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
              <h2>🃏 Amerikaans Jokeren</h2>
              <div className="rules-content">
                <h3>Doel</h3>
                <p>De speler met de <strong>laagste totaalscore</strong> aan het einde wint!</p>

                <h3>Scoren per ronde</h3>
                <ul>
                  <li><strong>Wie uitgaat</strong> krijgt <strong>0 punten</strong></li>
                  <li>Alle anderen tellen hun resterende handkaarten op als strafpunten</li>
                </ul>

                <h3>Kaartwaarden</h3>
                <table className="scoring-table">
                  <tbody>
                    <tr><td>Joker</td><td>25 punten</td></tr>
                    <tr><td>Aas</td><td>15 punten</td></tr>
                    <tr><td>Koning, Vrouw, Boer</td><td>10 punten</td></tr>
                    <tr><td>10 t/m 2</td><td>nominale waarde</td></tr>
                  </tbody>
                </table>

                <h3>Wanneer eindigt het spel?</h3>
                <ul>
                  <li><strong>Vast aantal rondes</strong> (bijv. 5 of 10)</li>
                  <li><strong>Puntenlimiet</strong> (eerste die bijv. 500 bereikt, verliest)</li>
                  <li><strong>Geen limiet</strong> (handmatig stoppen)</li>
                </ul>
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

function CardIcon() {
  return (
    <svg className="card-icon" viewBox="0 0 32 32" width="32" height="32">
      <rect x="4" y="2" width="18" height="24" rx="2" fill="#f9ed69" />
      <rect x="10" y="6" width="18" height="24" rx="2" fill="#e94560" />
      <text x="19" y="22" fontSize="12" fontWeight="bold" fill="white" textAnchor="middle">J</text>
    </svg>
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
