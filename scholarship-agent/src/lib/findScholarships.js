import scholarships from "../data/scholarships.json";

export default function findScholarships(profile) {
  return scholarships.filter((scholarship) => {
    const incomeOk =
      !profile.income || profile.income <= scholarship.incomeLimit;

    const stateOk =
      scholarship.state === "All" || scholarship.state === profile.state;

    const courseOk =
      profile.course === "" ||
      scholarship.course.toLowerCase().includes(profile.course.toLowerCase());

    return incomeOk && stateOk && courseOk;
  });
}
