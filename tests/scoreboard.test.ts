import { describe, expect, it } from "vitest";
import { buildScoreboard } from "../server/utils/scoreboard";

describe("buildScoreboard", () => {
  const questions = [
    { id: 1, titulo: "Q1" },
    { id: 2, titulo: "Q2" },
  ];

  it("keeps best submission per question and sorts by correct count", () => {
    const rows = buildScoreboard(
      [
        {
          id: "a1",
          questao_id: 1,
          user_id: "u1",
          email: "a@ufms.br",
          acertos: 1,
          total_testes: 2,
          created_at: "2026-06-20T10:00:00.000Z",
        },
        {
          id: "a2",
          questao_id: 1,
          user_id: "u1",
          email: "a@ufms.br",
          acertos: 2,
          total_testes: 2,
          created_at: "2026-06-20T10:05:00.000Z",
        },
        {
          id: "b1",
          questao_id: 1,
          user_id: "u2",
          email: "b@ufms.br",
          acertos: 1,
          total_testes: 2,
          created_at: "2026-06-20T10:02:00.000Z",
        },
      ],
      questions,
    );

    expect(rows[0].email).toBe("a@ufms.br");
    expect(rows[0].totalCorrect).toBe(1);
    expect(rows[0].questions[1].percent).toBe(100);
    expect(rows[1].email).toBe("b@ufms.br");
  });
});
