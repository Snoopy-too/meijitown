/**
 * Project Meiji - boardgame.io Game Definition
 * Runs on The Flying Dutchmen Node.js Koa server and automatically persists
 * game state into the lobby's MySQL database (matches & match_history tables).
 */

let INVALID_MOVE = 'INVALID_MOVE';
try {
  const bgCore = require('boardgame.io/core');
  if (bgCore && bgCore.INVALID_MOVE) {
    INVALID_MOVE = bgCore.INVALID_MOVE;
  }
} catch (_) {}

const MeijiTownGame = {
  name: 'meiji-town',

  setup: (ctx, setupData) => {
    const mode = (setupData && setupData.mode) || 'standard';
    const isSandbox = mode === 'sandbox';

    return {
      mode,
      chronicle: {
        currentYear: 1872,
        currentMonth: 1,
      },
      vitals: {
        cityName: 'Edo-Tokyo',
        treasury: isSandbox ? 9999999 : 5000,
        cashflow: 0,
        population: 0,
        satisfaction: 65,
        milestoneTier: 1,
      },
      metrics: {
        traditionModernityBalance: 50,
        fireRisk: 20,
        choleraRisk: 10,
        industrialDemand: 30,
        commercialDemand: 40,
        residentialDemand: 60,
      },
      gridSnapshot: null, // Compressed JSON representation of city grid
      lastSaved: Date.now(),
      historyLog: [
        {
          year: 1872,
          month: 1,
          message: 'Meiji era begins in Edo-Tokyo. The new municipal council convenes.'
        }
      ]
    };
  },

  turn: {
    minMoves: 0,
    maxMoves: 1000,
  },

  moves: {
    /**
     * Syncs city state from client simulation tick or manual player save.
     * This mutates state G and triggers boardgame.io's MySQLAdapter persistence.
     */
    syncCityState: ({ G }, payload) => {
      if (!payload || typeof payload !== 'object') {
        return INVALID_MOVE;
      }

      if (payload.vitals) {
        G.vitals = { ...G.vitals, ...payload.vitals };
      }
      if (payload.chronicle) {
        G.chronicle = { ...G.chronicle, ...payload.chronicle };
      }
      if (payload.metrics) {
        G.metrics = { ...G.metrics, ...payload.metrics };
      }
      if (payload.gridSnapshot) {
        G.gridSnapshot = payload.gridSnapshot;
      }
      G.lastSaved = Date.now();
    },

    /**
     * Records a month chronicle advance or historical event log.
     */
    advanceChronicle: ({ G }, logEntry) => {
      if (G.chronicle) {
        let { currentYear, currentMonth } = G.chronicle;
        currentMonth += 1;
        if (currentMonth > 12) {
          currentMonth = 1;
          currentYear += 1;
        }
        G.chronicle = { currentYear, currentMonth };
      }
      if (logEntry && typeof logEntry === 'object') {
        G.historyLog.push(logEntry);
        if (G.historyLog.length > 50) {
          G.historyLog.shift();
        }
      }
    },

    /**
     * Trigger game over if city enters irreversible bankruptcy (non-sandbox mode).
     */
    declareBankruptcy: ({ G }) => {
      if (G.mode !== 'sandbox' && G.vitals.treasury < -50000) {
        G.isBankrupt = true;
      }
    }
  },

  endIf: ({ G }) => {
    if (G.isBankrupt) {
      return { bankrupt: true, reason: 'Municipal Treasury Exhausted' };
    }
  }
};

module.exports = MeijiTownGame;
