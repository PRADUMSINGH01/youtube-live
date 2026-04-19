import { addJob } from "./Producer.js";

//in this queue we  fetcha all today match from 11:59pm to 11:59pm and store in database
export async function fixMatch(matchId: string) {
    await addJob("fix-match", { matchId });
}


