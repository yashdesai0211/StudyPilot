window.AnalyticsEngine = {
  summarize(subjects, attempts, sessions) {
    const chapters = subjects.flatMap(s => (s.chapters || []).map(c => ({...c, subjectName:s.name})));
    const mastered = chapters.filter(c => c.status === "confident").length;
    const completed = chapters.filter(c => ["tested","confident"].includes(c.status)).length;
    const totalQuestions = attempts.reduce((n,a) => n + (Number(a.total)||0), 0);
    const totalCorrect = attempts.reduce((n,a) => n + (Number(a.correct)||0), 0);
    const minutes = sessions.reduce((n,s) => n + (Number(s.minutes)||0), 0);
    return {
      chapters:chapters.length, mastered, testedOrConfident:completed,
      completion:chapters.length ? Math.round(completed/chapters.length*100) : 0,
      accuracy:totalQuestions ? Math.round(totalCorrect/totalQuestions*100) : null,
      questions:totalQuestions, minutes,
      weakest:chapters.filter(c => c.status !== "confident").sort((a,b) => ({"not-started":0,"studied":1,"practised":2,"tested":3}[a.status]??0)-({"not-started":0,"studied":1,"practised":2,"tested":3}[b.status]??0)).slice(0,4)
    };
  }
};