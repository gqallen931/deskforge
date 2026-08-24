import { AuthGate } from './features/auth/AuthGate.jsx';
import { LegacyDashboardHost } from './features/dashboard/LegacyDashboardHost.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';

function App() {
  return <ErrorBoundary><AuthGate><LegacyDashboardHost /></AuthGate></ErrorBoundary>;
}

export default App;
