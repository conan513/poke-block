// src/battle/BattleSystem.js – Turn-based Pokémon battle
import { getEffectiveness, POKEDEX } from '../data/pokedex.js';

const CATCH_RATE = { pokeball: 1.0, greatball: 1.5, ultraball: 2.0 };

export class BattleSystem {
  constructor(spawner) {
    this.spawner = spawner;
    this.active = false;
    this.playerPokemon = null;
    this.wildEntity = null;
    this.wildPokemon = null;
    this.player = null;
    this._state = 'idle'; // idle, choosing, animating
    this._messageQueue = [];
    this._animTimer = 0;
    this._bindUI();
  }

  _bindUI() {
    document.getElementById('btn-fight').onclick  = () => this._onFight();
    document.getElementById('btn-bag').onclick    = () => this._onBag();
    document.getElementById('btn-pokemon').onclick= () => this._onPokemon();
    document.getElementById('btn-run').onclick    = () => this._onRun();
  }

  startBattle(wildEntity, player) {
    this.active = true;
    this.wildEntity = wildEntity;
    this.player = player;

    // Setup wild Pokémon
    const name = wildEntity.name;
    const data = POKEDEX[name];
    this.wildPokemon = {
      ...data,
      name: data.name,
      typeName: name,
      hp: data.baseHp,
      maxHp: data.baseHp,
      level: wildEntity.level,
      status: null,
      atkStage: 0, defStage: 0, spdStage: 0,
      moves: data.moves.map(m => ({ ...m, curPP: m.pp })),
    };

    // Setup player's active Pokémon
    const playerMon = player.team[0];
    this.playerPokemon = {
      ...playerMon,
      typeName: playerMon.name?.toLowerCase(),
      atkStage: 0, defStage: 0, spdStage: 0,
    };

    // Show battle screen
    const screen = document.getElementById('battle-screen');
    screen.classList.add('active');
    document.exitPointerLock();

    this._showMainButtons();
    this._updateHPBars();

    // Animate battle start
    screen.style.animation = 'none';
    screen.style.opacity = '0';
    requestAnimationFrame(() => {
      screen.style.transition = 'opacity 0.4s';
      screen.style.opacity = '1';
    });

    this._message(`A wild ${this.wildPokemon.name} appeared!`);
    this._state = 'choosing';
  }

  _message(text, delay = 0) {
    this._messageQueue.push({ text, delay });
    if (this._messageQueue.length === 1) this._processMessages();
  }

  async _processMessages() {
    while (this._messageQueue.length > 0) {
      const { text, delay } = this._messageQueue[0];
      document.getElementById('battle-message').textContent = text;
      await this._wait(delay || 1200);
      this._messageQueue.shift();
    }
  }

  _wait(ms) { return new Promise(r => setTimeout(r, ms)); }

  _updateHPBars() {
    if (!this.wildPokemon || !this.playerPokemon) return;

    const wPct = Math.max(0, this.wildPokemon.hp / this.wildPokemon.maxHp * 100);
    const pPct = Math.max(0, this.playerPokemon.hp / this.playerPokemon.maxHp * 100);

    const wFill = document.getElementById('enemy-hp-fill');
    const pFill = document.getElementById('player-hp-fill');

    wFill.style.width = wPct + '%';
    pFill.style.width = pPct + '%';

    // Color based on HP
    [{ fill: wFill, pct: wPct }, { fill: pFill, pct: pPct }].forEach(({ fill, pct }) => {
      fill.className = 'battle-hpbar-fill';
      if (pct <= 25) fill.classList.add('red');
      else if (pct <= 50) fill.classList.add('yellow');
    });

    document.getElementById('enemy-name').textContent = `${this.wildPokemon.name}`;
    document.getElementById('enemy-level').textContent = `Lv.${this.wildPokemon.level}`;
    document.getElementById('player-poke-name').textContent = this.playerPokemon.name;
    document.getElementById('player-level').textContent = `Lv.${this.playerPokemon.level || 5}`;
    document.getElementById('player-hp-text').textContent = `${Math.max(0,Math.floor(this.playerPokemon.hp))} / ${this.playerPokemon.maxHp}`;
  }

  _showMainButtons() {
    document.getElementById('battle-main-btns').style.display = 'grid';
    document.getElementById('battle-moves').style.display = 'none';
  }

  _showMoves() {
    const moves = this.playerPokemon.moves || [];
    const container = document.getElementById('battle-moves');
    container.innerHTML = '';
    container.style.display = 'grid';
    document.getElementById('battle-main-btns').style.display = 'none';

    moves.forEach((move, i) => {
      const btn = document.createElement('div');
      btn.className = `battle-btn ${move.type || 'normal'}`;
      btn.innerHTML = `${move.name} <span class="move-pp">${move.curPP}/${move.pp} PP</span>`;
      btn.onclick = () => this._useMove(move, i);
      container.appendChild(btn);
    });

    // Back button
    const back = document.createElement('div');
    back.className = 'battle-btn';
    back.textContent = '← Back';
    back.style.gridColumn = '1/-1';
    back.onclick = () => this._showMainButtons();
    container.appendChild(back);
  }

  _onFight() {
    if (this._state !== 'choosing') return;
    this._showMoves();
  }

  _onBag() {
    if (this._state !== 'choosing') return;
    document.getElementById('battle-main-btns').style.display = 'none';
    const container = document.getElementById('battle-moves');
    container.style.display = 'grid';
    container.innerHTML = '';

    const balls = this.player.pokeballs || 0;
    const btn = document.createElement('div');
    btn.className = 'battle-btn';
    btn.innerHTML = `🔴 Poké Ball <span class="move-pp">×${balls}</span>`;
    btn.onclick = () => this._throwBall('pokeball');
    container.appendChild(btn);

    const back = document.createElement('div');
    back.className = 'battle-btn';
    back.textContent = '← Back';
    back.onclick = () => this._showMainButtons();
    container.appendChild(back);
  }

  _onPokemon() {
    this._message('No other Pokémon in team!');
  }

  _onRun() {
    if (this._state !== 'choosing') return;
    this._message('Got away safely!');
    setTimeout(() => this._endBattle(false), 1200);
  }

  async _useMove(move, idx) {
    if (this._state !== 'choosing') return;
    this._state = 'animating';
    this._showMainButtons();

    move.curPP = Math.max(0, move.curPP - 1);

    this._message(`${this.playerPokemon.name} used ${move.name}!`);
    await this._wait(1000);

    if (move.category !== 'status' && move.power > 0) {
      const dmg = this._calcDamage(move, this.playerPokemon, this.wildPokemon);
      const eff = getEffectiveness(move.type, this.wildPokemon.types || [this.wildPokemon.typeName]);
      this.wildPokemon.hp = Math.max(0, this.wildPokemon.hp - dmg);
      this._updateHPBars();

      if (eff > 1) { this._message("It's super effective!"); await this._wait(700); }
      else if (eff < 1 && eff > 0) { this._message("It's not very effective..."); await this._wait(700); }
      else if (eff === 0) { this._message("It has no effect!"); await this._wait(700); }
    } else {
      this._applyStatusEffect(move.effect, this.wildPokemon);
    }

    if (this.wildPokemon.hp <= 0) {
      this._message(`${this.wildPokemon.name} fainted!`);
      const exp = Math.floor((this.wildPokemon.baseHp + 50) * this.wildPokemon.level / 7);
      this.playerPokemon.exp = (this.playerPokemon.exp || 0) + exp;
      await this._wait(1000);
      this._message(`${this.playerPokemon.name} gained ${exp} EXP!`);
      await this._wait(1200);
      this._endBattle(true);
      return;
    }

    // Enemy turn
    await this._wait(400);
    await this._enemyTurn();
  }

  async _enemyTurn() {
    const moves = this.wildPokemon.moves.filter(m => m.curPP > 0);
    if (moves.length === 0) { this._state = 'choosing'; return; }

    const move = moves[Math.floor(Math.random() * moves.length)];
    move.curPP--;

    this._message(`${this.wildPokemon.name} used ${move.name}!`);
    await this._wait(1000);

    if (move.category !== 'status' && move.power > 0) {
      const dmg = this._calcDamage(move, this.wildPokemon, this.playerPokemon);
      this.playerPokemon.hp = Math.max(0, this.playerPokemon.hp - dmg);
      this._updateHPBars();
    }

    if (this.playerPokemon.hp <= 0) {
      this._message(`${this.playerPokemon.name} fainted!`);
      await this._wait(1200);
      this._message('You blacked out!');
      await this._wait(1500);
      this._endBattle(false);
      return;
    }

    this._state = 'choosing';
  }

  _calcDamage(move, attacker, defender) {
    if (!move.power) return 0;
    const level = attacker.level || 5;
    const atk = (attacker.atk || 50) * this._stageMultiplier(attacker.atkStage || 0);
    const def = (defender.def || 50) * this._stageMultiplier(defender.defStage || 0);

    // Gen 5 damage formula
    let dmg = ((2 * level / 5 + 2) * move.power * (atk / def)) / 50 + 2;

    // STAB
    const atkTypes = attacker.types || [attacker.typeName];
    if (atkTypes.includes(move.type)) dmg *= 1.5;

    // Type effectiveness
    const defTypes = defender.types || [defender.typeName];
    dmg *= getEffectiveness(move.type, defTypes);

    // Random 85-100%
    dmg *= (0.85 + Math.random() * 0.15);

    return Math.max(1, Math.floor(dmg));
  }

  _stageMultiplier(stage) {
    const table = [0.25,0.29,0.33,0.4,0.5,0.66,1,1.5,2,2.5,3,3.5,4];
    return table[Math.max(0, Math.min(12, stage + 6))];
  }

  _applyStatusEffect(effect, target) {
    if (!effect) return;
    if (effect === 'lower_atk') { target.atkStage = Math.max(-6, (target.atkStage||0)-1); this._message("Attack fell!"); }
    if (effect === 'lower_def') { target.defStage = Math.max(-6, (target.defStage||0)-1); this._message("Defense fell!"); }
    if (effect === 'lower_spd') { target.spdStage = Math.max(-6, (target.spdStage||0)-1); this._message("Speed fell!"); }
    if (effect === 'raise_def') { target.defStage = Math.min(6, (target.defStage||0)+1); this._message("Defense rose!"); }
    if (effect === 'poison')    { target.status = 'poison'; this._message(`${target.name} was poisoned!`); }
    if (effect === 'paralysis_10' && Math.random() < 0.1) { target.status = 'paralysis'; this._message(`${target.name} is paralyzed!`); }
    if (effect === 'burn_10' && Math.random() < 0.1) { target.status = 'burn'; this._message(`${target.name} was burned!`); }
  }

  async _throwBall(ballType) {
    this._state = 'animating';
    this._showMainButtons();

    if (!this.player.pokeballs || this.player.pokeballs <= 0) {
      this._message("You have no Poké Balls!");
      this._state = 'choosing';
      return;
    }
    this.player.pokeballs--;

    this._message(`You threw a Poké Ball!`);
    await this._wait(1200);

    // Catch probability (simplified)
    const rate = CATCH_RATE[ballType] || 1;
    const hpFactor = 1 - (this.wildPokemon.hp / this.wildPokemon.maxHp) * 0.5;
    const catchProb = Math.min(0.95, (this.wildPokemon.catchRate / 255) * rate * hpFactor);

    if (Math.random() < catchProb) {
      this._message(`Gotcha! ${this.wildPokemon.name} was caught!`);
      const caught = {
        ...POKEDEX[this.wildEntity.name],
        name: this.wildPokemon.name,
        typeName: this.wildEntity.name,
        hp: this.wildPokemon.hp,
        maxHp: this.wildPokemon.maxHp,
        level: this.wildPokemon.level,
        exp: 0,
        moves: this.wildPokemon.moves,
      };
      this.player.caught = this.player.caught || [];
      this.player.caught.push(this.wildEntity.name);
      if (this.player.team.length < 6) {
        this.player.team.push(caught);
      }
      await this._wait(1500);
      this._endBattle(true);
    } else {
      this._message(`${this.wildPokemon.name} broke free!`);
      await this._wait(1000);
      await this._enemyTurn();
    }
  }

  _endBattle(won) {
    this.active = false;
    this._state = 'idle';
    this._messageQueue = [];

    // Sync player HP
    if (this.player.team[0]) {
      this.player.team[0].hp = this.playerPokemon.hp;
    }

    // Dispose wild entity
    if (this.wildEntity) {
      this.wildEntity.dispose?.();
      const idx = this.spawner.entities.indexOf(this.wildEntity);
      if (idx >= 0) this.spawner.entities.splice(idx, 1);
      this.wildEntity = null;
    }

    const screen = document.getElementById('battle-screen');
    screen.style.transition = 'opacity 0.5s';
    screen.style.opacity = '0';
    setTimeout(() => {
      screen.classList.remove('active');
      screen.style.opacity = '';
      // Re-lock pointer
      document.getElementById('game-canvas').requestPointerLock();
    }, 500);
  }

  update(delta) {
    // Could add animation timers here
  }
}
