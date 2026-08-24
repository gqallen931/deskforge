import { useCallback, useEffect, useRef, useState } from 'react';
import { SettingsCenter } from '../settings/SettingsCenter.jsx';
import { NotificationsCenter } from '../notifications/NotificationsCenter.jsx';
import { ProjectsCenter } from '../projects/ProjectsCenter.jsx';
import { TaskCenter } from '../tasks/TaskCenter.jsx';
import { TimelineCenter } from '../timeline/TimelineCenter.jsx';
import { FilesCenter } from '../files/FilesCenter.jsx';
import { AnalysisCenter } from '../analysis/AnalysisCenter.jsx';
import { TeamCenter } from '../team/TeamCenter.jsx';
import { WorkspaceCenter } from '../workspaces/WorkspaceCenter.jsx';
import { SearchCenter } from '../search/SearchCenter.jsx';

export function LegacyDashboardHost() {
  const [module, setModule] = useState(null);
  const [moduleData, setModuleData] = useState({});
  const frameRef = useRef(null);
  useEffect(() => {
    const receive = (event) => {
      if (event.source === frameRef.current?.contentWindow && event.data?.type === 'deskforge:open-module') {
        setModuleData(event.data.payload || {});
        setModule(event.data.module);
      }
      if (event.source === window && event.data?.type === 'deskforge:workspace-changed') frameRef.current?.contentWindow?.postMessage({ type: 'deskforge:refresh-summary' }, '*');
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, []);
  const close = useCallback(() => { setModule(null); setModuleData({}); }, []);
  return (
    <>
      <iframe ref={frameRef} className="dashboard-frame" src="./dashboard.html" title="Deskforge personal workspace" />
      {module === 'settings' && <SettingsCenter onClose={close} />}
      {module === 'notifications' && <NotificationsCenter onClose={close} />}
      {module === 'reminders' && <NotificationsCenter initialTab="reminders" onClose={close} />}
      {module === 'projects' && <ProjectsCenter onClose={close} />}
      {module === 'tasks' && <TaskCenter onClose={close} />}
      {module === 'timeline' && <TimelineCenter onClose={close} />}
      {module === 'files' && <FilesCenter onClose={close} />}
      {module === 'analysis' && <AnalysisCenter onClose={close} />}
      {module === 'team' && <TeamCenter onClose={close} />}
      {module === 'workspaces' && <WorkspaceCenter onClose={close} />}
      {module === 'search' && <SearchCenter initialQuery={moduleData.query || ''} onClose={close} />}
    </>
  );
}
