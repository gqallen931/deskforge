import { AuthGate } from './features/auth/AuthGate.jsx';
import { LegacyDashboardHost } from './features/dashboard/LegacyDashboardHost.jsx';

function App() {
  return <AuthGate><LegacyDashboardHost /></AuthGate>;
}

export default App;
