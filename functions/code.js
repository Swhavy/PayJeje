//Avoid Edge cases

import { useId } from "react";
import { defaultBuildStages } from "three/webgpu";

const stats = doc(db, "users", uid, "achievements", "stats");
const snap = await getDoc(stats);

const todayDb = Admin.Firestore.Timestamp.now();
const today = new Date(todayDb.toDate());
const startOfToday = today.setHours(0, 0, 0, 0);
const data = snap.data();
const lastCheckedInDB = data.lastCheckedIn?.toDate();

let streaks = 1;
let pointsEarned = 10;
let totalPoints = pointsEarned;

if (lastCheckedInDB) {
  const lastCheckedIn = new Date(lastCheckedInDB);
  const startOfLastCheckedIn = lastCheckedIn.setHours(0, 0, 0, 0);
  const diffDays = Math.floor(
    (startOfToday.getTime() - startOfLastCheckedIn.getTime()) /
      (1000 * 60 * 60 * 24),
  );

  if ((diffDays = 0)) {
    throw new Error("User has already checked in today.");
  } else if (diffDays == 1) {
    streaks = (data.streaks || 0) + 1;
  }

  //reset streak if more than 1 day has passed
  else {
    streaks = 1;
  }
}
if (streaks == 3) pointsEarned = 20;
if (streaks == 7) pointsEarned = 50;
if (streaks == 14) pointsEarned = 100;

totalPoints = (data.pointsEarned || 0) + pointsEarned;

await stats.update({
  lastCheckedIn: Admin.Firestore.Timestamp.now(),
  streaks: streaks,
  pointsEarned: Admin.Firestore.FieldValue.increment(pointsEarned),
});
