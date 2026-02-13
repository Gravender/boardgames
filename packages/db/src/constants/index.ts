import { image, round, scoresheet } from "../schema";

//Scoresheet
export const scoreSheetRoundsScore = scoresheet.roundsScore.enumValues;
export const scoreSheetWinConditions = scoresheet.winCondition.enumValues;
export const scoreSheetTypes = scoresheet.type.enumValues;

//Round
export const roundTypes = round.type.enumValues;

//Image
export const imageUsageTypes = image.usageType.enumValues;
