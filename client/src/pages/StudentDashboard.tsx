import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { GradesSection } from '../components/student/GradesSection';
import { StudentTopNav, type StudentTab } from '../components/student/StudentTopNav';
import { TaskListSection } from '../components/student/TaskListSection';
import { QuizModule } from '../components/quiz/QuizModule';
import { VocabExplorer } from '../components/vocab/VocabExplorer';
import { useTasksAndSubmissions } from '../hooks/useTasksAndSubmissions';
import { AssignedQuizzes } from '../components/quiz/AssignedQuizzes';
import { AuthoredLectures } from '../components/student/AuthoredLectures';

export function StudentDashboard() {
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<StudentTab>('lectures');
  const learning = useTasksAndSubmissions(session?.token ?? '');

  const handleSignOut = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col">
      <StudentTopNav
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        studentName={session?.user.name ?? ''}
        onSignOut={handleSignOut}
      />

      <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-10 sm:px-6 xl:px-8">
        <div key={activeTab} className="animate-fade-in-up">
          {activeTab === 'lectures' && (
            <div className="flex flex-col gap-10">
              <AuthoredLectures />
              <VocabExplorer />
            </div>
          )}
          {activeTab === 'quizzes' && (
            <div className="flex flex-col gap-10">
              <AssignedQuizzes />
              <QuizModule />
            </div>
          )}
          {activeTab === 'activities' && (
            <TaskListSection
              type="ACTIVITY"
              title="Activities"
              subtitle="Short tasks tied to what you're currently learning."
              learning={learning}
            />
          )}
          {activeTab === 'performance' && (
            <TaskListSection
              type="PERFORMANCE_TASK"
              title="Performance tasks"
              subtitle="Bigger, multi-step tasks worth more points."
              learning={learning}
            />
          )}
          {activeTab === 'grades' && <GradesSection learning={learning} />}
        </div>
      </main>
    </div>
  );
}
