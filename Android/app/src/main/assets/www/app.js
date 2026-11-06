(() => {
"use strict";
const $ = id => document.getElementById(id);
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : "id-" + Date.now() + "-" + Math.random().toString(16).slice(2));
let timerInterval = null, timerRemaining = 25*60, timerRunning = false, currentQuiz = null;
const defaultProfile = {id:"profile", displayName:"", standard:"", board:"", purpose:""};
const statusOptions = Object.entries(AcademicEngine.labels);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmtDate = d => new Date(d).toLocaleDateString(undefined,{day:"numeric",month:"short",year:"numeric"});
function toast(msg){const el=$("toast");el.textContent=msg;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),2600);}
function showModal(html){$("modalContent").innerHTML=html;$("modal").showModal();}
function closeModal(){if($("modal").open)$("modal").close();}
async function all(store){return StudyStore.all(store);}
async function profile(){return (await StudyStore.get("settings","profile")) || defaultProfile;}
async function subjects(){return all("subjects");}
function setView(view){
  document.querySelectorAll(".view").forEach(x=>x.classList.toggle("active",x.id==="view-"+view));
  document.querySelectorAll(".nav-item[data-view]").forEach(x=>x.classList.toggle("active",x.dataset.view===view));
  const titles={overview:"Overview",subjects:"Subjects & syllabus",revision:"Revision queue",practice:"Practice & quizzes",analytics:"Academic insights",notes:"Notes",timer:"Focus timer",settings:"Settings & backup"};
  $("pageTitle").textContent=titles[view]||"StudyPilot";
  $("sidebar").classList.remove("open");
  renderCurrent(view);
}
async function renderCurrent(v){const map={overview:renderOverview,subjects:renderSubjects,revision:renderRevision,practice:renderPractice,analytics:renderAnalytics,notes:renderNotes,settings:renderSettings};if(map[v])await map[v]();}
async function renderOverview(){
 const [p,ss,attempts,sessions,activity]=await Promise.all([profile(),subjects(),all("attempts"),all("sessions"),all("activity")]);
 const chapters=ss.flatMap(s=>s.chapters||[]),due=RevisionEngine.due(ss);
 const a=AnalyticsEngine.summarize(ss,attempts,sessions);
 $("greeting").textContent=p.displayName?`Let's make today count, ${p.displayName}.`:"Make progress you can measure.";
 $("profileStrip").classList.toggle("hidden",!!(p.displayName||p.standard));
 $("statSubjects").textContent=ss.length;$("statMastered").textContent=a.mastered;$("statDue").textContent=due.length;$("statAccuracy").textContent=a.accuracy===null?"—":a.accuracy+"%";$("statAttempts").textContent=a.questions?`${a.questions} questions recorded`:"No quiz attempts yet";
 const next=AcademicEngine.nextAction(ss,due);$("nextAction").innerHTML=`<b>${esc(next.title)}</b><br>${esc(next.body)}`;
 const recent=activity.sort((x,y)=>new Date(y.at)-new Date(x.at)).slice(0,4);
 $("recentActivity").innerHTML=recent.length?recent.map(x=>`<div class="activity-item"><div><b>${esc(x.title)}</b><small>${esc(x.detail||"")}</small></div><span>${fmtDate(x.at)}</span></div>`).join(""):`<p class="empty">No activity yet. Add a subject or record a study session to get started.</p>`;
 $("subjectSnapshot").innerHTML=ss.length?ss.map(s=>{const n=(s.chapters||[]).length,pc=AcademicEngine.progress(s.chapters||[]);return `<div class="snapshot-row"><b>${esc(s.name)}</b><div class="bar"><span style="width:${pc}%"></span></div><small>${pc}%</small></div>`}).join(""):`<p class="empty">No subjects yet. Add your first subject to start tracking your preparation.</p>`;
}
async function renderSubjects(){
 const ss=await subjects();
 $("subjectsList").innerHTML=ss.length?ss.map(s=>`<article class="subject-card"><div class="subject-card-head"><div><h3>${esc(s.name)}</h3><small>${(s.chapters||[]).length} chapters · ${AcademicEngine.progress(s.chapters||[])}% progress</small></div><div class="subject-actions"><button class="mini-btn" data-add-chapter="${esc(s.id)}">＋ Chapter</button><button class="mini-btn" data-edit-subject="${esc(s.id)}">Edit</button><button class="mini-btn" data-delete-subject="${esc(s.id)}">Delete</button></div></div><div class="chapter-list">${(s.chapters||[]).length?(s.chapters||[]).map(c=>`<div class="chapter-row"><div><b>${esc(c.name)}</b><small>Updated ${c.updatedAt?fmtDate(c.updatedAt):"not yet"}</small></div><select class="status-select" data-status-subject="${esc(s.id)}" data-status-chapter="${esc(c.id)}">${statusOptions.map(([k,v])=>`<option value="${k}" ${c.status===k?"selected":""}>${v}</option>`).join("")}</select><small class="chapter-due">${c.nextReview?"Review "+fmtDate(c.nextReview):" "}</small></div>`).join(""):`<p class="empty">No chapters yet. Add chapters from your syllabus.</p>`}</div></article>`).join(""):`<div class="panel"><p class="empty">Your syllabus starts here. Add a subject, then add its chapters. StudyPilot does not invent or claim an official syllabus list.</p></div>`;
}
async function addSubject(existing=null){
 showModal(`<h2>${existing?"Edit subject":"Add a subject"}</h2><div class="form-grid"><div class="field"><label>Subject name</label><input id="subjectName" maxlength="70" required value="${esc(existing?.name||"")}" placeholder="e.g. Mathematics 1"></div><div class="field"><label>Optional colour label</label><select id="subjectColor"><option value="blue">Blue</option><option value="green">Green</option><option value="violet">Violet</option><option value="amber">Amber</option></select></div></div><div class="modal-actions"><button class="btn btn-secondary" value="cancel">Cancel</button><button class="btn btn-primary" type="button" id="saveSubject">Save subject</button></div>`);
 $("saveSubject").onclick=async()=>{try{const name=SafeInput.requiredText($("subjectName").value,"Subject name",70);const s=existing?{...existing,name}:{id:uid(),name,color:$("subjectColor").value,chapters:[],createdAt:new Date().toISOString()};await StudyStore.put("subjects",s);await log(existing?"Updated subject":"Added subject",name);closeModal();await renderSubjects();await renderOverview();toast("Subject saved.");}catch(e){toast(e.message);}};
}
async function addChapter(subjectId){
 const ss=await subjects(),s=ss.find(x=>x.id===subjectId);if(!s)return;
 showModal(`<h2>Add a chapter</h2><p class="muted small">Subject: ${esc(s.name)}</p><div class="form-grid"><div class="field"><label>Chapter or topic name</label><input id="chapterName" maxlength="100" required placeholder="Enter chapter name"></div></div><div class="modal-actions"><button class="btn btn-secondary" value="cancel">Cancel</button><button class="btn btn-primary" type="button" id="saveChapter">Add chapter</button></div>`);
 $("saveChapter").onclick=async()=>{try{const name=SafeInput.requiredText($("chapterName").value,"Chapter name",100);s.chapters=s.chapters||[];s.chapters.push({id:uid(),name,status:"not-started",createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),nextReview:null});await StudyStore.put("subjects",s);await log("Added chapter",`${name} · ${s.name}`);closeModal();await renderSubjects();await renderOverview();toast("Chapter added.");}catch(e){toast(e.message);}};
}
async function updateStatus(sid,cid,status){
 const ss=await subjects(),s=ss.find(x=>x.id===sid);if(!s)return;const c=(s.chapters||[]).find(x=>x.id===cid);if(!c)return;c.status=status;c.updatedAt=new Date().toISOString();c.nextReview=status==="not-started"?null:RevisionEngine.schedule(status);await StudyStore.put("subjects",s);await log("Updated learning status",`${c.name}: ${AcademicEngine.labels[status]}`);await renderSubjects();await renderOverview();toast("Learning status updated.");
}
async function renderRevision(){
 const due=RevisionEngine.due(await subjects());
 $("revisionList").innerHTML=due.length?due.map(c=>`<div class="revision-item"><div><b>${esc(c.chapterName)}</b><small>${esc(c.subjectName)} · ${AcademicEngine.labels[c.status]} · Due ${fmtDate(c.due)}</small></div><span class="tag">Review due</span><button class="mini-btn" data-revise="${esc(c.subjectId)}|${esc(c.chapterId)}">Review now</button></div>`).join(""):`<div class="panel"><p class="empty">Nothing is due right now. As you update chapter statuses, StudyPilot will suggest review dates. This schedule is a guide, not a scientific guarantee.</p></div>`;
}
async function renderPractice(){
 const [qs,ats]=await Promise.all([all("quizzes"),all("attempts")]);
 $("quizList").innerHTML=qs.length?qs.map(q=>`<div class="quiz-item"><div><b>${esc(q.title)}</b><small>${q.questions.length} questions · ${fmtDate(q.createdAt)}</small></div><button class="btn btn-primary" data-start-quiz="${esc(q.id)}">Start</button><button class="mini-btn" data-delete-quiz="${esc(q.id)}">Delete</button></div>`).join(""):`<p class="empty">No quizzes yet. Create a question set using your own study material.</p>`;
 $("quizHistory").innerHTML=ats.length?ats.slice().sort((a,b)=>new Date(b.at)-new Date(a.at)).slice(0,8).map(a=>`<div class="activity-item"><div><b>${esc(a.quizTitle)}</b><small>${a.correct}/${a.total} correct</small></div><span>${Math.round(a.correct/a.total*100)}%</span></div>`).join(""):`<p class="empty">Your quiz results will appear here.</p>`;
}
async function createQuiz(){
 const ss=await subjects();
 showModal(`<h2>Create a quiz</h2><div class="form-grid"><div class="field"><label>Quiz title</label><input id="quizTitle" maxlength="80" placeholder="e.g. Algebra revision"></div><div class="field"><label>Subject (optional)</label><select id="quizSubject"><option value="">General practice</option>${ss.map(s=>`<option value="${esc(s.name)}">${esc(s.name)}</option>`).join("")}</select></div><div class="field"><label>Question</label><textarea id="qText" maxlength="500" placeholder="Write a question"></textarea></div><div class="field"><label>Correct answer</label><input id="qAnswer" maxlength="180" placeholder="Enter the correct answer"></div><div class="field"><label>Other answer options (optional, separate with |)</label><input id="qOptions" maxlength="500" placeholder="Option B | Option C | Option D"></div></div><button class="btn btn-secondary" type="button" id="addQuestion">＋ Add another question</button><div id="questionDrafts" class="tiny muted" style="margin-top:10px">1 question drafted</div><div class="modal-actions"><button class="btn btn-secondary" value="cancel">Cancel</button><button class="btn btn-primary" type="button" id="saveQuiz">Save quiz</button></div>`);
 let questions=[];
 const add=()=>{try{const question=SafeInput.requiredText($("qText").value,"Question",500),answer=SafeInput.requiredText($("qAnswer").value,"Correct answer",180),opts=$("qOptions").value.split("|").map(x=>SafeInput.text(x,180)).filter(Boolean);questions.push({question,answer,options:[answer,...opts].slice(0,5)});$("qText").value="";$("qAnswer").value="";$("qOptions").value="";$("questionDrafts").textContent=`${questions.length} question${questions.length===1?"":"s"} drafted`;return true;}catch(e){toast(e.message);return false;}};
 $("addQuestion").onclick=add;
 $("saveQuiz").onclick=async()=>{try{if($("qText").value.trim()||$("qAnswer").value.trim()){if(!add())return;}if(!questions.length)throw new Error("Add at least one question.");const title=SafeInput.requiredText($("quizTitle").value,"Quiz title",80);const q={id:uid(),title,subject:$("quizSubject").value,questions,createdAt:new Date().toISOString()};await StudyStore.put("quizzes",q);await log("Created quiz",title);closeModal();await renderPractice();toast("Quiz saved.");}catch(e){toast(e.message);}};
}
async function startQuiz(id){
 const q=await StudyStore.get("quizzes",id);if(!q)return;currentQuiz={quiz:q,index:0,answers:[]};renderQuizQuestion();
}
function renderQuizQuestion(){
 const r=$("quizRunner");r.classList.remove("hidden");const {quiz,index,answers}=currentQuiz;
 if(index>=quiz.questions.length){finishQuiz();return;}
 const q=quiz.questions[index],opts=q.options?.length?q.options:[q.answer];
 r.innerHTML=`<div class="panel-head"><div><p class="eyebrow">QUESTION ${index+1} OF ${quiz.questions.length}</p><h3>${esc(quiz.title)}</h3></div><button class="text-btn" id="exitQuiz">Exit quiz</button></div><h3 style="line-height:1.6;margin:15px 0">${esc(q.question)}</h3><div>${opts.map((o,i)=>`<label class="question-option"><input type="radio" name="quizAnswer" value="${esc(o)}"> ${esc(o)}</label>`).join("")}</div><div class="modal-actions"><button class="btn btn-primary" id="nextQuestion">${index===quiz.questions.length-1?"Finish":"Next question"}</button></div>`;
 $("exitQuiz").onclick=()=>{currentQuiz=null;r.classList.add("hidden");};
 $("nextQuestion").onclick=()=>{const selected=document.querySelector('input[name="quizAnswer"]:checked');if(!selected){toast("Choose an answer first.");return;}answers.push(selected.value);currentQuiz.index++;renderQuizQuestion();};
}
async function finishQuiz(){
 const {quiz,answers}=currentQuiz;let correct=0;quiz.questions.forEach((q,i)=>{if(String(answers[i]).trim().toLowerCase()===String(q.answer).trim().toLowerCase())correct++;});
 const attempt={id:uid(),quizId:quiz.id,quizTitle:quiz.title,total:quiz.questions.length,correct,at:new Date().toISOString()};await StudyStore.put("attempts",attempt);await log("Completed quiz",`${quiz.title}: ${correct}/${quiz.questions.length}`);currentQuiz=null;
 $("quizRunner").innerHTML=`<p class="eyebrow">QUIZ COMPLETE</p><h2 style="font:800 27px Manrope">${correct} / ${quiz.questions.length}</h2><p class="${correct===quiz.questions.length?"result-good":"result-bad"}">${Math.round(correct/quiz.questions.length*100)}% correct</p><p class="muted small">This result reflects this quiz only. It is not a prediction of examination marks.</p><button class="btn btn-primary" id="closeResult">Done</button>`;$("closeResult").onclick=()=>{$("quizRunner").classList.add("hidden");renderPractice();renderOverview();};
}
async function renderAnalytics(){
 const [ss,ats,sessions]=await Promise.all([subjects(),all("attempts"),all("sessions")]),a=AnalyticsEngine.summarize(ss,ats,sessions),due=RevisionEngine.due(ss);
 $("anaTracked").textContent=a.chapters;$("anaCompletion").textContent=a.completion+"%";$("anaAccuracy").textContent=a.accuracy===null?"—":a.accuracy+"%";$("anaFocus").textContent=a.minutes+" min";
 $("focusRecommendations").innerHTML=a.weakest.length?a.weakest.map(c=>`<div class="activity-item"><div><b>${esc(c.name)}</b><small>${esc(c.subjectName)} · ${AcademicEngine.labels[c.status]}</small></div><span>Focus</span></div>`).join(""):`<p class="empty">Add chapters and update their status to receive focus suggestions.</p>`;
 $("realityCheck").innerHTML=`<p class="muted small" style="line-height:1.7">You have tracked <b>${a.chapters}</b> chapters. <b>${a.testedOrConfident}</b> are marked tested or confident. <b>${due.length}</b> are due for review. These indicators describe only the information you enter; they do not measure your full knowledge or predict exam results.</p>`;
 $("analyticsSubjects").innerHTML=ss.length?ss.map(s=>`<div class="snapshot-row" style="margin:14px 0"><b>${esc(s.name)}</b><div class="bar"><span style="width:${AcademicEngine.progress(s.chapters||[])}%"></span></div><small>${AcademicEngine.progress(s.chapters||[])}%</small></div>`).join(""):`<p class="empty">No subject data to analyse yet.</p>`;
}
async function renderNotes(){
 const ns=(await all("notes")).sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt));
 $("notesList").innerHTML=ns.length?ns.map(n=>`<article class="note-card"><h3>${esc(n.title)}</h3><p>${esc(n.body)}</p><footer><small class="muted">${fmtDate(n.updatedAt)}</small><span><button class="mini-btn" data-edit-note="${esc(n.id)}">Edit</button> <button class="mini-btn" data-delete-note="${esc(n.id)}">Delete</button></span></footer></article>`).join(""):`<div class="panel"><p class="empty">No notes yet. Create a short summary, doubt or reminder.</p></div>`;
}
async function editNote(id=null){
 const old=id?await StudyStore.get("notes",id):null;
 showModal(`<h2>${old?"Edit note":"New note"}</h2><div class="form-grid"><div class="field"><label>Title</label><input id="noteTitle" maxlength="100" value="${esc(old?.title||"")}"></div><div class="field"><label>Note</label><textarea id="noteBody" maxlength="5000">${esc(old?.body||"")}</textarea></div></div><div class="modal-actions"><button class="btn btn-secondary" value="cancel">Cancel</button><button class="btn btn-primary" type="button" id="saveNote">Save note</button></div>`);
 $("saveNote").onclick=async()=>{try{const title=SafeInput.requiredText($("noteTitle").value,"Title",100),body=SafeInput.requiredText($("noteBody").value,"Note",5000);const n={id:old?.id||uid(),title,body,updatedAt:new Date().toISOString()};await StudyStore.put("notes",n);await log(old?"Edited note":"Created note",title);closeModal();renderNotes();toast("Note saved.");}catch(e){toast(e.message);}};
}
async function renderSettings(){
 const p=await profile();
 $("profileForm").innerHTML=`<div class="form-grid"><div class="field"><label>Display name (optional)</label><input id="profileName" maxlength="40" value="${esc(p.displayName||"")}" placeholder="What should we call you?"></div><div class="field"><label>Standard</label><select id="profileStandard"><option value="">Not set</option><option value="9" ${p.standard==="9"?"selected":""}>Class 9</option><option value="10" ${p.standard==="10"?"selected":""}>Class 10</option><option value="other" ${p.standard==="other"?"selected":""}>Other</option></select></div><div class="field"><label>Board (optional)</label><input id="profileBoard" maxlength="80" value="${esc(p.board||"")}" placeholder="e.g. Maharashtra State Board"></div><div class="field"><label>Purpose (optional)</label><select id="profilePurpose"><option value="">Prefer not to say</option><option ${p.purpose==="board-preparation"?"selected":""} value="board-preparation">Board examination preparation</option><option ${p.purpose==="regular-study"?"selected":""} value="regular-study">Regular study</option><option ${p.purpose==="revision"?"selected":""} value="revision">Revision and practice</option><option ${p.purpose==="organisation"?"selected":""} value="organisation">Organising my learning</option></select></div><button class="btn btn-primary" id="saveProfile">Save preferences</button></div><p class="tiny muted">These preferences are stored locally and are not sent to anyone.</p>`;
 $("saveProfile").onclick=async()=>{const next={id:"profile",displayName:SafeInput.text($("profileName").value,40),standard:$("profileStandard").value,board:SafeInput.text($("profileBoard").value,80),purpose:$("profilePurpose").value};await StudyStore.put("settings",next);await renderSettings();await renderOverview();toast("Preferences saved.");};
}
async function log(title,detail){await StudyStore.put("activity",{id:uid(),title,detail,at:new Date().toISOString()});}
async function exportData(){
 try{const data=await StudyStore.exportAll(),blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="studypilot-backup-"+new Date().toISOString().slice(0,10)+".json";a.click();URL.revokeObjectURL(url);toast("Backup exported.");}catch(e){toast(e.message);}
}
async function importData(file){
 if(!file)return;if(file.size>5*1024*1024){toast("Backup file is larger than 5 MB.");return;}
 try{const data=JSON.parse(await file.text());if(!confirm("Importing replaces all current StudyPilot data. Continue?"))return;await StudyStore.importAll(data);toast("Backup restored.");await renderOverview();setView("overview");}catch(e){toast("Import failed: "+e.message);}
}
async function deleteAll(){
 if(!confirm("Permanently delete all StudyPilot data stored in this browser? Export a backup first if you may need it."))return;
 if(!confirm("Please confirm once more. This cannot be undone without a backup."))return;
 await StudyStore.clearAll();toast("Local StudyPilot data deleted.");await renderOverview();setView("overview");
}
function timerRender(){const m=Math.floor(timerRemaining/60),s=timerRemaining%60;$("timerDisplay").textContent=String(m).padStart(2,"0")+":"+String(s).padStart(2,"0");const total=Number($("timerLength").value)*60;$("timer-ring");document.querySelector(".timer-ring").style.background=`conic-gradient(#4169e1 ${Math.max(0,Math.min(360,(total-timerRemaining)/total*360))}deg,#e8edf7 0deg)`;}
function timerReset(){clearInterval(timerInterval);timerRunning=false;timerRemaining=Number($("timerLength").value)*60;$("timerStart").textContent="Start focus";$("timerStatus").textContent="READY TO FOCUS";timerRender();}
async function timerFinish(){clearInterval(timerInterval);timerRunning=false;const mins=Number($("timerLength").value);await StudyStore.put("sessions",{id:uid(),minutes:mins,at:new Date().toISOString()});await log("Completed focus session",mins+" minutes");$("timerStatus").textContent="SESSION COMPLETE";$("timerStart").textContent="Start another";toast("Focus session completed. Nice work.");timerRemaining=0;timerRender();}
function bindEvents(){
 document.querySelectorAll(".nav-item[data-view]").forEach(b=>b.addEventListener("click",()=>setView(b.dataset.view)));
 document.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",()=>setView(b.dataset.go)));
 $("mobileMenu").onclick=()=>$("sidebar").classList.toggle("open");
 $("addSubjectBtn").onclick=()=>addSubject();$("setupProfile").onclick=()=>setView("settings");$("profileShortcut").onclick=()=>setView("settings");
 $("subjectsList").addEventListener("click",async e=>{const b=e.target.closest("button");if(!b)return;if(b.dataset.addChapter)addChapter(b.dataset.addChapter);if(b.dataset.editSubject){const s=(await subjects()).find(x=>x.id===b.dataset.editSubject);if(s)addSubject(s);}if(b.dataset.deleteSubject){if(confirm("Delete this subject and all its chapter records?")){await StudyStore.remove("subjects",b.dataset.deleteSubject);await renderSubjects();await renderOverview();toast("Subject deleted.");}}});
 $("subjectsList").addEventListener("change",e=>{if(e.target.matches("[data-status-subject]"))updateStatus(e.target.dataset.statusSubject,e.target.dataset.statusChapter,e.target.value);});
 $("refreshRevision").onclick=renderRevision;$("revisionList").addEventListener("click",async e=>{const b=e.target.closest("[data-revise]");if(!b)return;const [sid,cid]=b.dataset.revise.split("|");const ss=await subjects(),s=ss.find(x=>x.id===sid),c=s?.chapters.find(x=>x.id===cid);if(!c)return;c.updatedAt=new Date().toISOString();c.nextReview=RevisionEngine.schedule(c.status);await StudyStore.put("subjects",s);await log("Reviewed chapter",c.name);await renderRevision();toast("Next review date updated.");});
 $("createQuizBtn").onclick=createQuiz;$("quizList").addEventListener("click",async e=>{const b=e.target.closest("button");if(!b)return;if(b.dataset.startQuiz)startQuiz(b.dataset.startQuiz);if(b.dataset.deleteQuiz&&confirm("Delete this quiz? Existing attempts will remain in history.")){await StudyStore.remove("quizzes",b.dataset.deleteQuiz);renderPractice();}});
 $("addNoteBtn").onclick=()=>editNote();$("notesList").addEventListener("click",async e=>{const b=e.target.closest("button");if(!b)return;if(b.dataset.editNote)editNote(b.dataset.editNote);if(b.dataset.deleteNote&&confirm("Delete this note?")){await StudyStore.remove("notes",b.dataset.deleteNote);renderNotes();}});
 $("exportBtn").onclick=exportData;$("importFile").onchange=e=>importData(e.target.files[0]);$("deleteDataBtn").onclick=deleteAll;
 $("timerLength").onchange=timerReset;$("timerReset").onclick=timerReset;$("timerStart").onclick=()=>{if(timerRunning){clearInterval(timerInterval);timerRunning=false;$("timerStart").textContent="Resume";$("timerStatus").textContent="PAUSED";return;}if(timerRemaining<=0)timerReset();timerRunning=true;$("timerStart").textContent="Pause";$("timerStatus").textContent="FOCUS IN PROGRESS";timerInterval=setInterval(()=>{timerRemaining--;timerRender();if(timerRemaining<=0)timerFinish();},1000);};
}
async function init(){
 $("todayLabel").textContent=new Date().toLocaleDateString(undefined,{weekday:"long",day:"numeric",month:"long"}).toUpperCase();
 try{await StudyStore.get("settings","profile");bindEvents();await renderOverview();await renderSettings();timerReset();}
 catch(e){document.querySelector(".main").innerHTML=`<div class="panel"><h2>StudyPilot could not start</h2><p>${esc(e.message)}</p><p>Try opening this app in a current browser using localhost or HTTPS. Private browsing modes may restrict local storage.</p></div>`;}
 if("serviceWorker" in navigator && (location.protocol==="https:"||location.hostname==="localhost"))navigator.serviceWorker.register("./service-worker.js").catch(err=>console.warn("Offline worker registration failed:",err));
}
document.addEventListener("DOMContentLoaded",init);
})();