import { requireTeacher } from "../../../utils/server-auth";
import {
  clearSecurityEvents,
  createSecurityEvent,
  getActiveMarathon,
} from "../../../utils/firestore-repositories";

export default defineEventHandler(async (event) => {
  const teacher = await requireTeacher(event);
  const body = await readBody<{
    severity?: "all" | "normal" | "attention" | "critical";
    olderThanHours?: number;
  }>(event);

  const marathon = await getActiveMarathon();
  await clearSecurityEvents(marathon.id, {
    severity: body?.severity || "all",
    olderThanHours: body?.olderThanHours,
  });

  await createSecurityEvent(marathon.id, {
    email: teacher.email,
    event_type: "clear_log",
    severity: "normal",
    metadata: {
      severity: body?.severity || "all",
      olderThanHours: body?.olderThanHours || null,
    },
  });

  return { ok: true };
});
