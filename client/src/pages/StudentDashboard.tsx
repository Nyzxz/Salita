import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ProfileSection } from '../components/profile/ProfileSection';
import { GradesSection } from '../components/student/GradesSection';
import { StudentTopNav } from '../components/student/StudentTopNav';
import { StudentSidebar, type StudentTab } from '../components/student/StudentSidebar';
import { StudentOverview } from '../components/student/StudentOverview';
import { TaskListSection } from '../components/student/TaskListSection';
import { VocabExplorer } from '../components/vocab/VocabExplorer';
import { useTasksAndSubmissions } from '../hooks/useTasksAndSubmissions';
import { AssignedQuizzes } from '../components/quiz/AssignedQuizzes';
import { AppFooter } from '../components/layout/AppFooter';
import { AuthoredLectures } from '../components/student/AuthoredLectures';

const TAB_IDS: StudentTab[] = ['dashboard', 'lectures', 'quizzes', 'activities', 'performance', 'grades', 'profile'];

function tabFromHash(): StudentTab | null {
  const hash = window.location.hash.replace('#', '');
  return (TAB_IDS as string[]).includes(hash) ? (hash as StudentTab) : null;
}

export function StudentDashboard() {
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<StudentTab>(tabFromHash() ?? 'dashboard');

  // Notification links like /dashboard/student#grades open the matching tab.
  useEffect(() => {
    const onHash = () => {
      const tab = tabFromHash();
      if (tab) setActiveTab(tab);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  // Only poll while a tab that shows tasks or grades is open.
  const learning = useTasksAndSubmissions(
    session?.token ?? '',
    activeTab === 'dashboard' || activeTab === 'activities' || activeTab === 'performance' || activeTab === 'grades',
  );

  const changeTab = (tab: StudentTab) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0 });
  };

  const handleSignOut = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col">
      <StudentTopNav
        activeTab={activeTab}
        onChangeTab={changeTab}
        studentName={session?.user.name ?? ''}
        onSignOut={handleSignOut}
      />

      <div className="mx-auto grid w-full max-w-[1400px] flex-1 gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10 lg:py-10 xl:px-8">
        <StudentSidebar activeTab={activeTab} onChangeTab={changeTab} />
        <main className="min-w-0">
        <div key={activeTab} className="animate-fade-in-up">
          {activeTab === 'dashboard' && (
            <StudentOverview name={session?.user.name ?? ''} learning={learning} onOpen={changeTab} />
          )}
          {activeTab === 'lectures' && (
            <div className="flex flex-col gap-14">
              <AuthoredLectures />
              <VocabExplorer />
            </div>
          )}
          {activeTab === 'quizzes' && (
            <AssignedQuizzes />
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
          {activeTab === 'profile' && <ProfileSection />}
        </div>
        </main>
      </div>

      <AppFooter />
    </div>
  );
}
