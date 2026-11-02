/** Charge et valide les JSON de src/data/. Plante tôt et clairement si le contrat n'est pas respecté. */
import gameParams from '../data/game-params.json';
import gameMap from '../data/map.json';
import { GameConfigSchema, GameMapSchema } from './schema';
import type { GameContext } from './types';

export function loadContext(): GameContext {
  return {
    config: GameConfigSchema.parse(gameParams),
    map: GameMapSchema.parse(gameMap),
  };
}
