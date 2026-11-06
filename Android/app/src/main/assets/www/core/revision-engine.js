/* Simple, explainable revision intervals based on self-reported confidence. */
window.RevisionEngine = {
  intervalDays(status) {
    return {"not-started":0,"studied":1,"practised":3,"tested":7,"confident":14}[status] ?? 1;
  },
  dueDate(chapter) {
    if (chapter.nextReview) return new Date(chapter.nextReview);
    if (!chapter.updatedAt) return new Date();
    const d = new Date(chapter.updatedAt);
    d.setDate(d.getDate() + this.intervalDays(chapter.status));
    return d;
  },
  due(subjects, now = new Date()) {
    const result = [];
    for (const subject of subjects) for (const chapter of (subject.chapters || [])) {
      if (chapter.status === "not-started") continue;
      const due = this.dueDate(chapter);
      if (due <= now) result.push({subjectId:subject.id,subjectName:subject.name,chapterId:chapter.id,chapterName:chapter.name,status:chapter.status,due});
    }
    return result.sort((a,b) => a.due-b.due);
  },
  schedule(status, from = new Date()) {
    const date = new Date(from);
    date.setDate(date.getDate() + this.intervalDays(status));
    return date.toISOString();
  }
};