import { requireTeacher } from "../../utils/server-auth";
import {
  buildScoreboard,
  type ScoreQuestion,
  type ScoreSubmission,
} from "../../utils/scoreboard";
import {
  getActiveMarathon,
  listAllowedIpRanges,
  listIpBlocks,
  listScoreQuestions,
  listSecurityEvents,
  listSessions,
  listSubmissions,
} from "../../utils/firestore-repositories";

export default defineEventHandler(async (event) => {
  await requireTeacher(event);
  const marathon = await getActiveMarathon();
  const questions = await listScoreQuestions(marathon.id);

  const [ranges, sessions, blocks, events, submissions] = await Promise.all([
    listAllowedIpRanges(marathon.id),
    listSessions(marathon.id, 100),
    listIpBlocks(marathon.id),
    listSecurityEvents(marathon.id, 150),
    listSubmissions(marathon.id, 1000),
  ]);

  return {
    marathon,
    ranges,
    sessions,
    blocks,
    events,
    questions: questions as ScoreQuestion[],
    submissions,
    scoreboard: buildScoreboard(submissions as ScoreSubmission[], questions),
  };
});
