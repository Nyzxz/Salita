import { useState } from 'react';
import { Footer } from '../components/layout/Footer';
import { Header } from '../components/layout/Header';
import { QuizModule } from '../components/quiz/QuizModule';
import { Timeline } from '../components/timeline/Timeline';
import { VocabExplorer } from '../components/vocab/VocabExplorer';

export type Section = 'explore' | 'timeline' | 'practice';

export function ExplorerPage() {
  const [activeSection, setActiveSection] = useState<Section>('explore');

  return (
    <div className="flex min-h-screen flex-col">
      <Header activeSection={activeSection} onChangeSection={setActiveSection} />

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        {activeSection === 'explore' && <VocabExplorer />}
        {activeSection === 'timeline' && <Timeline />}
        {activeSection === 'practice' && <QuizModule />}
      </main>

      <Footer />
    </div>
  );
}
