/* Transparent academic status and prioritisation logic. */
window.AcademicEngine = {
  statuses: ["not-started", "studied", "practised", "tested", "confident"],
  labels: {"not-started":"Not started","studied":"Studied","practised":"Practised","tested":"Tested","confident":"Confident"},
  progress(chapters) {
    if (!chapters.length) return 0;
    const points = {"not-started":0,"studied":25,"practised":50,"tested":75,"confident":100};
    return Math.round(chapters.reduce((sum, c) => sum + (points[c.status] || 0), 0) / chapters.length);
  },
  score(chapter) {
    const points = {"not-started":0,"studied":25,"practised":50,"tested":75,"confident":100};
    return points[chapter.status] || 0;
  },
  nextAction(subjects, dueChapters) {
    if (!subjects.length) return {title:"Add your first subject", body:"Create a subject and add the chapters you want to track. You can edit this syllabus at any time."};
    if (dueChapters.length) {
      const c = dueChapters[0];
      return {title:"Review " + c.chapterName, body:"This chapter is due for revision in " + c.subjectName + ". Try a short recall session, then update its status or review date."};
    }
    const all = subjects.flatMap(s => (s.chapters || []).map(c => ({...c, subjectName:s.name})));
    const unfinished = all.filter(c => c.status !== "confident").sort((a,b) => this.score(a)-this.score(b));
    if (unfinished.length) {
      const c = unfinished[0];
      return {title:"Continue " + c.chapterName, body:c.subjectName + " is currently marked \"" + this.labels[c.status] + "\". A useful next step is to practise a few questions and check what you can recall without looking."};
    }
    return {title:"Maintain your understanding", body:"All tracked chapters are marked confident. Keep that knowledge fresh with occasional mixed practice and review."};
  }
};